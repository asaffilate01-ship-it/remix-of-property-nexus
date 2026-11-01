import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { agencyAccess } from "@/lib/deal-intelligence.functions";

const uuid = z.string().uuid();
const evidence = z.string().trim().min(5).max(600);
const complianceInput = z.object({
  amlRegistrationRef: evidence,
  redressMembershipRef: evidence,
  termsOfBusinessRef: evidence,
}).strict();
const startInput = z.object({ opportunityId: uuid, matchId: uuid.optional().nullable() }).strict();
const statusInput = z.object({
  commissionId: uuid,
  status: z.enum(["invoiced", "paid", "cancelled"]),
  completionEvidenceRef: evidence.optional().nullable(),
  invoiceReference: evidence.optional().nullable(),
  receiptReference: evidence.optional().nullable(),
}).strict();

export const listDealComplianceAndCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const db = context.supabase as any;
    const [compliance, fees] = await Promise.all([
      db.from("deal_agency_compliance").select("*").eq("agency_id", agency.id).maybeSingle(),
      db.from("deal_commissions")
        .select("*,deal_opportunities(title,status,postcode)")
        .eq("agency_id", agency.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (compliance.error) throw new Error(compliance.error.message);
    if (fees.error) throw new Error(fees.error.message);
    return {
      agencyId: agency.id, compliance: compliance.data ?? null,
      commissions: fees.data ?? [],
      note: "Commission entries represent declared invoices and manually evidenced receipts, not Stripe settlement or funds held by Gabley.",
    };
  });

export const submitDealAgencyCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => complianceInput.parse(input))
  .handler(async ({ context, data }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const agencyOwner = await context.supabase.from("agencies")
      .select("id").eq("id", agency.id).eq("owner_id", context.userId).maybeSingle();
    if (agencyOwner.error || !agencyOwner.data) {
      throw new Error("Only the verified agency owner may submit agency compliance evidence");
    }
    const db = context.supabase as any;
    const existing = await db.from("deal_agency_compliance")
      .select("approved_at").eq("agency_id", agency.id).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.approved_at) {
      throw new Error("Approved compliance evidence must be reviewed by a platform compliance administrator before amendment");
    }
    const response = await db.from("deal_agency_compliance")
      .upsert({
        agency_id: agency.id,
        aml_registration_ref: data.amlRegistrationRef,
        redress_membership_ref: data.redressMembershipRef,
        terms_of_business_ref: data.termsOfBusinessRef,
        submitted_by: context.userId,
        approved_at: null, approved_by: null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: "agency_id" }).select("agency_id,approved_at").single();
    if (response.error) throw new Error(response.error.message);
    return { agencyId: agency.id, status: "pending_platform_review" as const };
  });

export const createDealCommissionRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => startInput.parse(input))
  .handler(async ({ context, data }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const db = context.supabase as any;
    const opportunity = await db.from("deal_opportunities")
      .select("id,agency_id,proposed_fee,fee_payer,fee_vat_treatment,fee_disclosed,fee_disclosure_reference")
      .eq("id", data.opportunityId).eq("agency_id", agency.id).maybeSingle();
    if (opportunity.error || !opportunity.data) throw new Error("Opportunity not in your agency");
    const deal = opportunity.data;
    if (!deal.fee_disclosed || !deal.fee_disclosure_reference) {
      throw new Error("Written sourcing fee disclosures must be documented first");
    }
    const fees = await db.from("deal_commissions")
      .select("id").eq("opportunity_id", deal.id).eq("agency_id", agency.id).maybeSingle();
    if (fees.error) throw new Error(fees.error.message);
    if (fees.data) return { id: fees.data.id as string, created: false };
    const result = await db.from("deal_commissions").insert({
      agency_id: agency.id, opportunity_id: deal.id, match_id: data.matchId ?? null,
      fee_payer: deal.fee_payer, fee_vat_treatment: deal.fee_vat_treatment,
      fee_amount: deal.proposed_fee, status: "proposed", created_by: context.userId,
    }).select("id").single();
    if (result.error) throw new Error(result.error.message);
    return { id: result.data.id as string, created: true };
  });

export const updateDealCommissionRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => statusInput.parse(input))
  .handler(async ({ context, data }) => {
    const agency = await agencyAccess(context.supabase, context.userId);
    const db = context.supabase as any;
    const current = await db.from("deal_commissions").select("*")
      .eq("id", data.commissionId).eq("agency_id", agency.id).maybeSingle();
    if (current.error || !current.data) throw new Error("Commission record not found");
    const row = current.data;
    const allowed: Record<string, string[]> = {
      proposed: ["invoiced", "cancelled"],
      invoiced: ["paid", "cancelled"],
      paid: [],
      cancelled: [],
    };
    if (!allowed[row.status]?.includes(data.status)) throw new Error("This commission state transition is not permitted");
    const completionRef = data.completionEvidenceRef ?? row.completion_evidence_ref;
    const invoiceRef = data.invoiceReference ?? row.invoice_reference;
    if (data.status !== "cancelled" && (!completionRef || !invoiceRef)) {
      throw new Error("Completed sale evidence and invoice references are required");
    }
    if (data.status === "paid" && !data.receiptReference) {
      throw new Error("A verified bank receipt reference is required before marking a fee paid");
    }
    const result = await db.from("deal_commissions")
      .update({
        status: data.status,
        completion_evidence_ref: data.status === "cancelled" ? row.completion_evidence_ref : completionRef,
        invoice_reference: data.status === "cancelled" ? row.invoice_reference : invoiceRef,
        receipt_reference: data.status === "paid" ? data.receiptReference : row.receipt_reference,
        paid_at: data.status === "paid" ? new Date().toISOString() : row.paid_at,
      })
      .eq("id", data.commissionId).eq("agency_id", agency.id)
      .eq("status", row.status).select("id,status").maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Commission changed while updating. Refresh the ledger.");
    return { id: result.data.id as string, status: result.data.status as string };
  });
