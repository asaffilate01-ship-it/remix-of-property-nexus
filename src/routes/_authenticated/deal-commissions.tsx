import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BadgeCheck, FileCheck2, HandCoins, ReceiptText, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listDealComplianceAndCommissions, submitDealAgencyCompliance, createDealCommissionRecord, updateDealCommissionRecord,
} from "@/lib/deal-commission.functions";
import { listDealOpportunities } from "@/lib/deal-intelligence.functions";

export const Route = createFileRoute("/_authenticated/deal-commissions")({
  head: () => ({ meta: [{ title: "Deal compliance and commissions — Gabley" }] }),
  component: DealCommissionsPage,
});
type Compliance = {
  agency_id: string; aml_registration_ref: string; redress_membership_ref: string;
  terms_of_business_ref: string; approved_at: string | null;
};
type Commission = {
  id: string; opportunity_id: string; fee_amount: number; fee_payer: string;
  fee_vat_treatment: string; status: string; completion_evidence_ref: string | null;
  invoice_reference: string | null; receipt_reference: string | null; paid_at: string | null;
  deal_opportunities: { title: string; status: string; postcode: string | null } | null;
};
type Deal = { id: string; title: string; status: string; fee_disclosed: boolean; proposed_fee: number; fee_disclosure_reference: string | null };
const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function DealCommissionsPage() {
  const read = useServerFn(listDealComplianceAndCommissions);
  const readDeals = useServerFn(listDealOpportunities);
  const submit = useServerFn(submitDealAgencyCompliance);
  const create = useServerFn(createDealCommissionRecord);
  const update = useServerFn(updateDealCommissionRecord);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState({
    amlRegistrationRef: "", redressMembershipRef: "", termsOfBusinessRef: "",
  });
  const [feeId, setFeeId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completionRef, setCompletionRef] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [receiptRef, setReceiptRef] = useState("");

  const reload = async () => {
    try {
      const [finance, pipeline] = await Promise.all([read(), readDeals()]);
      setCompliance(finance.compliance as Compliance | null);
      setCommissions(finance.commissions as Commission[]);
      setDeals(pipeline.rows as Deal[]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load compliance or fee records.");
    }
  };
  useEffect(() => { void reload(); }, []);

  const saveEvidence = async () => {
    setWorking("compliance");
    try {
      await submit({ data: evidence });
      toast.success("Compliance evidence submitted for independent platform review");
      await reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Compliance submission failed");
    } finally { setWorking(null); }
  };
  const startFee = async () => {
    if (!feeId) return;
    setWorking("create");
    try {
      await create({ data: { opportunityId: feeId } });
      toast.success("Proposed commission entry created — not invoiced or paid");
      setFeeId("");
      await reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not record proposed fee");
    } finally { setWorking(null); }
  };
  const changeFee = async (commission: Commission, status: "invoiced" | "paid" | "cancelled") => {
    setWorking(commission.id);
    try {
      await update({ data: {
        commissionId: commission.id, status,
        completionEvidenceRef: completionRef.trim() || null,
        invoiceReference: invoiceRef.trim() || null,
        receiptReference: receiptRef.trim() || null,
      } });
      toast.success(status === "paid" ? "Manually evidenced receipt recorded" : "Commission entry updated");
      setEditingId(null); setCompletionRef(""); setInvoiceRef(""); setReceiptRef("");
      await reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Fee status could not be changed");
    } finally { setWorking(null); }
  };
  const proposed = deals.filter(d => d.fee_disclosed && d.fee_disclosure_reference && !commissions.some(c => c.opportunity_id === d.id));

  return <div className="space-y-6">
    <PageHeader title="Commissions & agency compliance" description="Disclosed sourcing fees, introduction readiness, manual invoices and receipts — not client-money processing."
      actions={<Button variant="outline" onClick={() => void reload()}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Refresh</Button>}
    />
    <div className="flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
      <ShieldAlert className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p>Gabley is an introducer/estate agency workflow, not the property buyer, an investment fund or an automatic fee collector. Fee disclosure to seller and buyer, authority, HMRC AML supervision and redress membership must be independently verified. No buyer introductions or fee invoices are created simply because AI identifies a potential deal.</p>
    </div>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}<Button variant="outline" size="sm" className="ml-2" onClick={() => void reload()}>Retry</Button></div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="shadow-card"><CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Agency compliance evidence</h2>
          <Badge variant={compliance?.approved_at ? "default" : "outline"}>{compliance?.approved_at ? "Independently approved" : compliance ? "Pending review" : "Not submitted"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Evidence references are reviewed by an authorised Gabley platform compliance administrator. Submitting them does not approve the agency or permit introductions.</p>
        {compliance?.approved_at ? (
          <div className="space-y-2 text-sm"><p className="flex items-center gap-2 font-medium"><BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Approved {new Date(compliance.approved_at).toLocaleDateString("en-GB")}</p>
            <p>AML registration: {compliance.aml_registration_ref}</p>
            <p>Redress membership: {compliance.redress_membership_ref}</p>
            <p>Terms reference: {compliance.terms_of_business_ref}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {([
              ["amlRegistrationRef","HMRC AML registration evidence reference"],
              ["redressMembershipRef","Approved property redress scheme reference"],
              ["termsOfBusinessRef","Written estate-agency terms reference"],
            ] as const).map(([key,label])=><div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label><Input id={key} value={evidence[key]} maxLength={600} onChange={event=>setEvidence({...evidence,[key]:event.target.value})} placeholder="Internal document or registration reference" />
            </div>)}
            <Button disabled={working==="compliance" || !Object.values(evidence).every(v=>v.trim().length>=5)} onClick={() => void saveEvidence()}>
              <FileCheck2 className="mr-2 h-4 w-4" aria-hidden="true" /> {working==="compliance"?"Submitting…":"Submit for platform review"}
            </Button>
          </div>
        )}
      </CardContent></Card>
      <Card className="shadow-card"><CardContent className="space-y-4 p-5">
        <h2 className="font-semibold">Open a proposed commission entry</h2>
        <p className="text-sm text-muted-foreground">Use an opportunity only once the proposed fee and who pays it have been disclosed and recorded in the deal workspace.</p>
        {!proposed.length ? <p className="text-sm text-muted-foreground">No disclosed deals without a commission entry. <Link to="/deal-intelligence" className="font-medium underline underline-offset-2">Set the fee terms in Deal Intelligence</Link>.</p> : (
          <>
            <Label htmlFor="commission-deal">Disclosed deal</Label>
            <select id="commission-deal" value={feeId} onChange={e=>setFeeId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Choose a disclosed opportunity</option>
              {proposed.map(deal=><option value={deal.id} key={deal.id}>{deal.title} · {fmt.format(deal.proposed_fee)}</option>)}
            </select>
            <Button disabled={!feeId || working==="create"} onClick={() => void startFee()}><HandCoins className="mr-2 h-4 w-4" aria-hidden="true" /> Record proposed fee</Button>
          </>
        )}
        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          Commission becomes invoiceable only after completed conveyancing, documented seller authority, fee disclosure and compliance approval. Marking paid requires an independent bank receipt reference; this does not move money.
        </div>
      </CardContent></Card>
    </div>

    <section className="space-y-3" aria-labelledby="commission-ledger-heading">
      <h2 id="commission-ledger-heading" className="text-lg font-semibold">Commission ledger</h2>
      {!commissions.length && <Card><CardContent className="p-8 text-sm text-muted-foreground text-center">No commission entries recorded. Proposed sourcing fees remain in the deal pipeline until explicitly added.</CardContent></Card>}
      {commissions.map(c=><Card className="shadow-card" key={c.id}><CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold">{c.deal_opportunities?.title ?? "Deal opportunity"}</h3>
            <p className="text-xs text-muted-foreground">{c.deal_opportunities?.postcode ?? "Postcode pending"} · {c.fee_payer} pays · VAT {c.fee_vat_treatment.replaceAll("_"," ")}</p></div>
          <div className="text-right"><div className="text-xl font-bold tabular">{fmt.format(c.fee_amount)}</div><Badge variant="outline">{c.status}</Badge></div>
        </div>
        {c.invoice_reference && <p className="text-xs text-muted-foreground">Invoice: {c.invoice_reference}</p>}
        {c.receipt_reference && <p className="text-xs text-muted-foreground">Receipt: {c.receipt_reference}</p>}
        {editingId === c.id ? <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          {c.status==="proposed" && <div className="space-y-1"><Label htmlFor={`completion-${c.id}`}>Completed sale evidence reference</Label>
            <Input id={`completion-${c.id}`} value={completionRef} onChange={e=>setCompletionRef(e.target.value)} /></div>}
          {c.status==="proposed" && <div className="space-y-1"><Label htmlFor={`invoice-${c.id}`}>Invoice reference</Label>
            <Input id={`invoice-${c.id}`} value={invoiceRef} onChange={e=>setInvoiceRef(e.target.value)} /></div>}
          {c.status==="invoiced" && <div className="space-y-1"><Label htmlFor={`receipt-${c.id}`}>Verified bank receipt reference</Label>
            <Input id={`receipt-${c.id}`} value={receiptRef} onChange={e=>setReceiptRef(e.target.value)} /></div>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={working===c.id} onClick={() => void changeFee(c,c.status==="proposed"?"invoiced":"paid")}>{c.status==="proposed"?"Record invoice":"Record bank receipt"}</Button>
            <Button size="sm" variant="outline" disabled={working===c.id} onClick={() => void changeFee(c,"cancelled")}>Cancel entry</Button>
            <Button size="sm" variant="ghost" onClick={()=>setEditingId(null)}>Close</Button>
          </div>
        </div> : (c.status==="proposed" || c.status==="invoiced") ? (
          <Button variant="outline" size="sm" onClick={() => {setEditingId(c.id);setCompletionRef(c.completion_evidence_ref??"");setInvoiceRef(c.invoice_reference??"");setReceiptRef("");}}>
            <ReceiptText className="mr-2 h-4 w-4" aria-hidden="true" /> {c.status==="proposed"?"Record completed sale and invoice":"Record bank receipt"}
          </Button>
        ) : <p className="text-xs text-muted-foreground">No further automatic changes to this commission record.</p>}
      </CardContent></Card>)}
    </section>
  </div>;
}
