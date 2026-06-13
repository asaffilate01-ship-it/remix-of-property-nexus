import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

export const createReferencingCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      agency_id: z.string().uuid().optional(),
      property_id: z.string().uuid().optional(),
      applicant: z.record(z.any()),
      employment: z.record(z.any()),
      previous_landlord: z.record(z.any()),
      income_monthly: z.number().optional(),
      credit_consent: z.boolean().default(false),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("referencing_cases")
      .insert({
        tenant_id: context.userId,
        agency_id: data.agency_id ?? null,
        property_id: data.property_id ?? null,
        status: "submitted",
        current_step: 1,
        applicant: data.applicant,
        employment: data.employment,
        previous_landlord: data.previous_landlord,
        income_monthly: data.income_monthly ?? null,
        credit_consent: data.credit_consent,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { case: row };
  });

export const getMyReferencingCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("referencing_cases")
      .select("*, properties(address,city,postcode), agencies(name)")
      .eq("tenant_id", context.userId)
      .order("created_at", { ascending: false });
    return { cases: data ?? [] };
  });

export const listAgencyReferencingCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { cases: [] };
    const { data } = await context.supabase
      .from("referencing_cases")
      .select("*, profiles:tenant_id(full_name,email:tenant_id(email)), properties(address,city,postcode), agencies(name)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });
    return { cases: data ?? [] };
  });

export const updateReferencingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["draft","submitted","in_review","approved","declined","withdrawn"]),
      decision: z.string().optional(),
      notes: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("Not an agency member.");
    const { data: row, error } = await context.supabase
      .from("referencing_cases")
      .update({
        status: data.status,
        decision: data.decision ?? null,
        notes: data.notes ?? null,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.id)
      .eq("agency_id", agencyId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { case: row };
  });

export const addReferencingDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      case_id: z.string().uuid(),
      doc_type: z.string(),
      storage_path: z.string(),
      file_size: z.number().optional(),
      mime_type: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("referencing_documents")
      .insert({
        case_id: data.case_id,
        doc_type: data.doc_type,
        storage_path: data.storage_path,
        file_size: data.file_size ?? null,
        mime_type: data.mime_type ?? null,
        uploaded_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { document: row };
  });

export const getReferencingDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ case_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("referencing_documents")
      .select("*")
      .eq("case_id", data.case_id)
      .order("created_at", { ascending: false });
    return { documents: rows ?? [] };
  });
