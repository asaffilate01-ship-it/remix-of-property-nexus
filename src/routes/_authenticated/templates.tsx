import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { FileSignature, FileText, Search, Filter, Plus, Eye, Send, Download, Copy, ShieldCheck, Sparkles, Pencil, ClipboardList, Vault, Wrench, UserCheck, Home, Scale, Receipt, Building2, ScrollText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/templates")({ component: TemplatesPage });

type Field = { key: string; label: string; type: "text" | "date" | "number" | "textarea" | "select"; options?: string[]; required?: boolean; placeholder?: string };

type Template = {
  id: string;
  name: string;
  category: "Tenancy" | "Sales" | "Maintenance" | "Compliance" | "Deposits" | "Inventory" | "Notices" | "Right to Rent";
  jurisdiction: "England & Wales" | "Scotland" | "Northern Ireland" | "UK-wide";
  authority?: string;
  description: string;
  pages: number;
  signers: ("Landlord" | "Tenant" | "Agent" | "Guarantor" | "Contractor" | "Buyer" | "Vendor" | "Witness")[];
  fields: Field[];
  popular?: boolean;
};

const TEMPLATES: Template[] = [
  {
    id: "ast",
    name: "Assured Shorthold Tenancy (AST)",
    category: "Tenancy",
    jurisdiction: "England & Wales",
    authority: "Housing Act 1988 (as amended)",
    description: "Standard fixed-term AST including How to Rent guide attachment, deposit prescribed information and break clauses.",
    pages: 14,
    signers: ["Landlord", "Tenant", "Agent"],
    popular: true,
    fields: [
      { key: "property", label: "Property address", type: "text", required: true, placeholder: "12 Acacia Avenue, London N1 4QQ" },
      { key: "landlord", label: "Landlord full name", type: "text", required: true },
      { key: "tenant", label: "Tenant(s) full name(s)", type: "textarea", required: true },
      { key: "start", label: "Tenancy start date", type: "date", required: true },
      { key: "term", label: "Initial term (months)", type: "number", required: true, placeholder: "12" },
      { key: "rent", label: "Monthly rent (£)", type: "number", required: true },
      { key: "deposit", label: "Deposit (£)", type: "number", required: true },
      { key: "scheme", label: "Deposit scheme", type: "select", options: ["DPS", "MyDeposits", "TDS"], required: true },
      { key: "payday", label: "Rent payment day", type: "select", options: ["1st", "15th", "Last working day"] },
      { key: "pets", label: "Pets permitted?", type: "select", options: ["No", "By prior consent", "Yes — listed in schedule"] },
    ],
  },
  {
    id: "scot-pri",
    name: "Private Residential Tenancy (PRT)",
    category: "Tenancy",
    jurisdiction: "Scotland",
    authority: "Private Housing (Tenancies) (Scotland) Act 2016",
    description: "Open-ended PRT with the 9 statutory model clauses and easy-read notes.",
    pages: 18,
    signers: ["Landlord", "Tenant"],
    fields: [
      { key: "property", label: "Property address", type: "text", required: true },
      { key: "landlord", label: "Landlord name & registration no.", type: "text", required: true },
      { key: "tenant", label: "Tenant(s) full name(s)", type: "textarea", required: true },
      { key: "start", label: "Start date", type: "date", required: true },
      { key: "rent", label: "Monthly rent (£)", type: "number", required: true },
    ],
  },
  {
    id: "guarantor",
    name: "Guarantor Agreement",
    category: "Tenancy",
    jurisdiction: "England & Wales",
    description: "Deed of guarantee co-extensive with the AST.",
    pages: 4,
    signers: ["Guarantor", "Landlord", "Witness"],
    fields: [
      { key: "guarantor", label: "Guarantor full name", type: "text", required: true },
      { key: "address", label: "Guarantor address", type: "textarea", required: true },
      { key: "tenant", label: "Tenant being guaranteed", type: "text", required: true },
      { key: "term", label: "Period covered (months)", type: "number", required: true },
    ],
    popular: true,
  },
  {
    id: "s21",
    name: "Section 21 (Form 6A) Notice",
    category: "Notices",
    jurisdiction: "England & Wales",
    authority: "Housing Act 1988 s.21",
    description: "Prescribed Form 6A — no-fault possession with 2-month minimum notice and validity pre-checks.",
    pages: 3,
    signers: ["Landlord"],
    fields: [
      { key: "tenant", label: "Tenant(s)", type: "textarea", required: true },
      { key: "property", label: "Property", type: "text", required: true },
      { key: "expiry", label: "Notice expiry date", type: "date", required: true },
      { key: "served_on", label: "Served on", type: "date", required: true },
      { key: "method", label: "Service method", type: "select", options: ["First class post", "Hand delivery", "Email (if permitted in AST)"] },
    ],
  },
  {
    id: "s8",
    name: "Section 8 Notice",
    category: "Notices",
    jurisdiction: "England & Wales",
    authority: "Housing Act 1988 s.8",
    description: "Possession on grounds (rent arrears, breach). Auto-selects grounds 8/10/11/12.",
    pages: 6,
    signers: ["Landlord"],
    fields: [
      { key: "tenant", label: "Tenant(s)", type: "textarea", required: true },
      { key: "property", label: "Property", type: "text", required: true },
      { key: "grounds", label: "Grounds relied on", type: "select", options: ["8 (≥2 months arrears)", "10 (some arrears)", "11 (persistent late)", "12 (other breach)"], required: true },
      { key: "arrears", label: "Arrears balance (£)", type: "number" },
    ],
  },
  {
    id: "rtr",
    name: "Right to Rent Check Record",
    category: "Right to Rent",
    jurisdiction: "England & Wales",
    authority: "Immigration Act 2014",
    description: "Document check log: passport / BRP / share code with follow-up date.",
    pages: 2,
    signers: ["Agent", "Tenant"],
    popular: true,
    fields: [
      { key: "tenant", label: "Tenant name", type: "text", required: true },
      { key: "dob", label: "Date of birth", type: "date", required: true },
      { key: "doc_type", label: "Document type", type: "select", options: ["UK / Irish passport", "BRP", "Share code", "EUSS status"], required: true },
      { key: "doc_no", label: "Document number / share code", type: "text", required: true },
      { key: "expiry", label: "Document expiry", type: "date" },
      { key: "follow_up", label: "Follow-up check due", type: "date" },
    ],
  },
  {
    id: "rrb-notice",
    name: "Renters' Rights — Statement of Terms",
    category: "Tenancy",
    jurisdiction: "England & Wales",
    authority: "Renters' Rights Act 2024",
    description: "Written statement for periodic tenancies (post-Section 21 abolition) with rent-increase Section 13 schedule.",
    pages: 8,
    signers: ["Landlord", "Tenant"],
    fields: [
      { key: "property", label: "Property", type: "text", required: true },
      { key: "tenant", label: "Tenant(s)", type: "textarea", required: true },
      { key: "rent", label: "Initial rent (£/mo)", type: "number", required: true },
      { key: "pet_request", label: "Pet request handling", type: "select", options: ["Permit by default", "Permit with insurance", "Reasonable refusal"] },
    ],
  },
  {
    id: "deposit-pi",
    name: "Deposit Prescribed Information",
    category: "Deposits",
    jurisdiction: "England & Wales",
    authority: "Housing Act 2004 / Localism Act 2011",
    description: "Auto-completed from the AST, ready to serve within 30 days of receipt.",
    pages: 4,
    signers: ["Landlord", "Tenant"],
    fields: [
      { key: "scheme", label: "Scheme", type: "select", options: ["DPS Custodial", "DPS Insured", "MyDeposits", "TDS"], required: true },
      { key: "deposit", label: "Deposit (£)", type: "number", required: true },
      { key: "received_on", label: "Received on", type: "date", required: true },
      { key: "cert_no", label: "Scheme certificate number", type: "text" },
    ],
    popular: true,
  },
  {
    id: "deposit-return",
    name: "Deposit Return Statement",
    category: "Deposits",
    jurisdiction: "UK-wide",
    description: "Itemised return with deductions, photos and evidence pack — links to Evidence vault.",
    pages: 3,
    signers: ["Landlord", "Tenant"],
    fields: [
      { key: "tenant", label: "Tenant", type: "text", required: true },
      { key: "deposit", label: "Deposit held (£)", type: "number", required: true },
      { key: "deductions", label: "Itemised deductions", type: "textarea", required: true, placeholder: "Carpet clean — £85 (quote attached)\nOven clean — £55" },
      { key: "return_amount", label: "Amount to return (£)", type: "number", required: true },
    ],
  },
  {
    id: "inv-checkin",
    name: "Inventory & Schedule of Condition — Check-in",
    category: "Inventory",
    jurisdiction: "UK-wide",
    description: "Room-by-room schedule with photo slots and tenant sign-off; mirrors mobile inspection app.",
    pages: 22,
    signers: ["Agent", "Tenant"],
    fields: [
      { key: "property", label: "Property", type: "text", required: true },
      { key: "clerk", label: "Inventory clerk", type: "text", required: true },
      { key: "checkin_date", label: "Check-in date", type: "date", required: true },
      { key: "meter_gas", label: "Gas meter reading", type: "text" },
      { key: "meter_elec", label: "Electric meter reading", type: "text" },
      { key: "meter_water", label: "Water meter reading", type: "text" },
    ],
    popular: true,
  },
  {
    id: "inv-checkout",
    name: "Check-out Report",
    category: "Inventory",
    jurisdiction: "UK-wide",
    description: "Comparison report against check-in with fair wear & tear assessment.",
    pages: 18,
    signers: ["Agent", "Tenant"],
    fields: [
      { key: "property", label: "Property", type: "text", required: true },
      { key: "checkout_date", label: "Check-out date", type: "date", required: true },
      { key: "forwarding", label: "Tenant forwarding address", type: "textarea", required: true },
    ],
  },
  {
    id: "wo-instruction",
    name: "Contractor Work Instruction",
    category: "Maintenance",
    jurisdiction: "UK-wide",
    description: "Scope of works, agreed price, Gas Safe / NICEIC certification requirements and RAMS reference.",
    pages: 3,
    signers: ["Agent", "Contractor"],
    fields: [
      { key: "property", label: "Property", type: "text", required: true },
      { key: "scope", label: "Scope of works", type: "textarea", required: true },
      { key: "price", label: "Agreed price (£, ex VAT)", type: "number", required: true },
      { key: "start", label: "Start date", type: "date", required: true },
      { key: "trade", label: "Trade", type: "select", options: ["Gas Safe", "NICEIC", "Plumbing", "Roofing", "General"] },
    ],
  },
  {
    id: "wo-completion",
    name: "Works Completion & Sign-off",
    category: "Maintenance",
    jurisdiction: "UK-wide",
    description: "Tenant or landlord sign-off with photo evidence and warranty terms.",
    pages: 2,
    signers: ["Contractor", "Tenant"],
    fields: [
      { key: "job_ref", label: "Job reference", type: "text", required: true },
      { key: "completed_on", label: "Completed on", type: "date", required: true },
      { key: "warranty_months", label: "Warranty (months)", type: "number", placeholder: "12" },
    ],
  },
  {
    id: "gas-record",
    name: "CP12 Landlord Gas Safety Record",
    category: "Compliance",
    jurisdiction: "UK-wide",
    authority: "Gas Safety (I&U) Regs 1998",
    description: "Engineer-signed CP12 with appliance schedule (Gas Safe registered only).",
    pages: 2,
    signers: ["Contractor"],
    fields: [
      { key: "gas_safe_no", label: "Gas Safe registration", type: "text", required: true },
      { key: "issued", label: "Issue date", type: "date", required: true },
      { key: "next_due", label: "Next due", type: "date", required: true },
    ],
  },
  {
    id: "eicr",
    name: "EICR — Electrical Installation Condition Report",
    category: "Compliance",
    jurisdiction: "England",
    authority: "Electrical Safety Standards Regs 2020",
    description: "5-yearly EICR with C1/C2/C3/FI coding and remedial works tracker.",
    pages: 8,
    signers: ["Contractor"],
    fields: [
      { key: "engineer", label: "Engineer name & qualification", type: "text", required: true },
      { key: "scheme", label: "Scheme", type: "select", options: ["NICEIC", "NAPIT", "ECA"], required: true },
      { key: "result", label: "Overall result", type: "select", options: ["Satisfactory", "Unsatisfactory"], required: true },
    ],
  },
  {
    id: "memo-sale",
    name: "Memorandum of Sale",
    category: "Sales",
    jurisdiction: "England & Wales",
    description: "Distribution to both solicitors with chain summary and AML reference.",
    pages: 2,
    signers: ["Agent"],
    fields: [
      { key: "property", label: "Property", type: "text", required: true },
      { key: "price", label: "Agreed price (£)", type: "number", required: true },
      { key: "vendor", label: "Vendor", type: "text", required: true },
      { key: "buyer", label: "Buyer", type: "text", required: true },
      { key: "vendor_sol", label: "Vendor's solicitor", type: "text" },
      { key: "buyer_sol", label: "Buyer's solicitor", type: "text" },
    ],
    popular: true,
  },
  {
    id: "sole-agency",
    name: "Sole Agency Agreement",
    category: "Sales",
    jurisdiction: "UK-wide",
    description: "TPOS-compliant sole agency with fee structure and cooling-off notice.",
    pages: 6,
    signers: ["Agent", "Vendor"],
    fields: [
      { key: "vendor", label: "Vendor", type: "text", required: true },
      { key: "property", label: "Property", type: "text", required: true },
      { key: "fee_pct", label: "Fee (% inc VAT)", type: "number", required: true, placeholder: "1.5" },
      { key: "term_weeks", label: "Sole agency period (weeks)", type: "number", placeholder: "12" },
    ],
  },
  {
    id: "rent-increase",
    name: "Section 13 Rent Increase Notice",
    category: "Notices",
    jurisdiction: "England & Wales",
    authority: "Housing Act 1988 s.13",
    description: "Annual rent review with prescribed notice period and reference rent justification.",
    pages: 2,
    signers: ["Landlord"],
    fields: [
      { key: "current_rent", label: "Current rent (£/mo)", type: "number", required: true },
      { key: "new_rent", label: "New rent (£/mo)", type: "number", required: true },
      { key: "effective", label: "Effective date", type: "date", required: true },
    ],
  },
];

const CAT_ICON: Record<Template["category"], typeof FileText> = {
  Tenancy: Home,
  Sales: Building2,
  Maintenance: Wrench,
  Compliance: ShieldCheck,
  Deposits: Vault,
  Inventory: ClipboardList,
  Notices: ScrollText,
  "Right to Rent": UserCheck,
};

function FillDialog({ tpl }: { tpl: Template }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"fill" | "preview" | "sign">("fill");
  const missing = tpl.fields.filter(f => f.required && !values[f.key]?.trim()).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="flex-1"><Pencil className="h-3 w-3 mr-1" />Fill &amp; sign</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tpl.name}
            <Badge variant="outline">{tpl.jurisdiction}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="fill">1. Fill fields</TabsTrigger>
            <TabsTrigger value="preview">2. Preview</TabsTrigger>
            <TabsTrigger value="sign">3. Send for e-sign</TabsTrigger>
          </TabsList>

          <TabsContent value="fill" className="space-y-4 mt-4">
            {tpl.authority && (
              <div className="text-xs text-muted-foreground border-l-2 border-primary pl-3">
                Authority: {tpl.authority}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              const auto: Record<string, string> = {};
              tpl.fields.forEach(f => { if (f.key === "property") auto[f.key] = "12 Acacia Avenue, London N1 4QQ"; });
              setValues(v => ({ ...auto, ...v }));
              toast.success("Pre-filled from property record");
            }}>
              <Sparkles className="h-3 w-3 mr-2" />Pre-fill from property
            </Button>
            <div className="grid sm:grid-cols-2 gap-4">
              {tpl.fields.map(f => (
                <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <Label className="text-xs">{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea rows={3} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
                  ) : f.type === "select" ? (
                    <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={values[f.key] ?? ""} onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}>
                      <option value="">Select…</option>
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card><CardContent className="p-6 bg-muted/20 max-h-[400px] overflow-y-auto font-serif text-sm space-y-3">
              <div className="text-center">
                <div className="font-bold text-base uppercase tracking-wide">{tpl.name}</div>
                <div className="text-xs text-muted-foreground">{tpl.jurisdiction} · {tpl.authority ?? "Standard form"}</div>
              </div>
              <p>THIS AGREEMENT is made between the parties identified below in respect of the property at <strong>{values.property || "[property address]"}</strong>.</p>
              {tpl.fields.map(f => values[f.key] && (
                <p key={f.key}><span className="text-muted-foreground">{f.label}:</span> <strong>{values[f.key]}</strong></p>
              ))}
              <p className="text-xs text-muted-foreground pt-4 border-t">Signature blocks for: {tpl.signers.join(", ")}</p>
            </CardContent></Card>
            {missing > 0 && <p className="text-xs text-warning mt-2">⚠ {missing} required field{missing > 1 ? "s" : ""} still empty.</p>}
          </TabsContent>

          <TabsContent value="sign" className="space-y-4 mt-4">
            <div className="text-sm">Add signer email addresses. Each will receive a unique link and the signed PDF will be sealed with an audit trail.</div>
            {tpl.signers.map(role => (
              <div key={role} className="grid grid-cols-3 gap-2 items-center">
                <Badge variant="outline" className="justify-center">{role}</Badge>
                <Input className="col-span-2" placeholder={`${role.toLowerCase()}@example.com`} />
              </div>
            ))}
            <Card><CardContent className="p-3 text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
              eIDAS Advanced Electronic Signature · SHA-256 hashed · RFC 3161 timestamp · audit log retained 12 years.
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {step === "fill" && <Button onClick={() => setStep("preview")} disabled={missing > 0}>Continue →</Button>}
          {step === "preview" && <>
            <Button variant="outline" onClick={() => setStep("fill")}>← Back</Button>
            <Button variant="outline"><Download className="h-3 w-3 mr-2" />Download draft</Button>
            <Button onClick={() => setStep("sign")}>Send for signature →</Button>
          </>}
          {step === "sign" && <Button onClick={() => toast.success("Envelope sent — tracking in E-signatures")}>
            <Send className="h-3 w-3 mr-2" />Send envelope
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesPage() {
  const [cat, setCat] = useState<"All" | Template["category"]>("All");
  const [q, setQ] = useState("");

  const cats: ("All" | Template["category"])[] = ["All", "Tenancy", "Notices", "Deposits", "Inventory", "Maintenance", "Compliance", "Right to Rent", "Sales"];

  const rows = useMemo(() => TEMPLATES.filter(t =>
    (cat === "All" || t.category === cat) &&
    (q === "" || (t.name + t.description + t.category).toLowerCase().includes(q.toLowerCase()))
  ), [cat, q]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document templates</h1>
          <p className="text-sm text-muted-foreground">Fill prescribed forms in minutes — pre-filled from the property and tenancy record, sent for e-signature, sealed into the document vault.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Copy className="h-4 w-4 mr-2" />Clone template</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Custom template</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Templates available", value: TEMPLATES.length, icon: FileText },
          { label: "In progress", value: 7, icon: Pencil },
          { label: "Out for signature", value: 12, icon: Send, tone: "warning" as const },
          { label: "Signed this month", value: 48, icon: FileSignature, tone: "success" as const },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{s.label}</span><s.icon className="h-4 w-4 text-muted-foreground" /></div>
            <div className={`text-2xl font-bold mt-1 ${s.tone === "success" ? "text-success" : s.tone === "warning" ? "text-warning" : ""}`}>{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search AST, CP12, S21, deposit, inventory, EICR…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Jurisdiction</Button>
      </div>

      <Tabs value={cat} onValueChange={(v) => setCat(v as typeof cat)}>
        <TabsList className="flex flex-wrap h-auto">
          {cats.map(c => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={cat} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map(t => {
              const Icon = CAT_ICON[t.category];
              return (
                <Card key={t.id} className="flex flex-col">
                  <CardContent className="p-4 flex-1 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-9 w-9 rounded-md bg-primary/10 text-primary inline-flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <div className="font-medium text-sm leading-tight truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.category} · {t.pages} pages</div>
                        </div>
                      </div>
                      {t.popular && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Popular</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{t.description}</p>
                    {t.authority && <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" />{t.authority}</div>}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{t.jurisdiction}</Badge>
                      {t.signers.map(s => <Badge key={s} variant="secondary" className="text-[10px]"><FileSignature className="h-2.5 w-2.5 mr-1" />{s}</Badge>)}
                    </div>
                    <div className="flex gap-1 mt-auto pt-2">
                      <FillDialog tpl={t} />
                      <Button size="icon" variant="ghost"><Eye className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost"><Copy className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {rows.length === 0 && <div className="col-span-full p-12 text-center text-sm text-muted-foreground">No templates match.</div>}
          </div>
        </TabsContent>
      </Tabs>

      <Card><CardContent className="p-4 flex items-start gap-3">
        <Receipt className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm">
          <div className="font-medium">Auto-merge from your records</div>
          <p className="text-muted-foreground">Templates pre-fill from properties, tenancies, contacts and compliance records. Signed PDFs land in the document vault with the correct retention policy (AST: 12yr, RtR: 1yr post-tenancy, HMRC: 7yr) and trigger the next workflow step automatically.</p>
        </div>
      </CardContent></Card>
    </div>
  );
}
