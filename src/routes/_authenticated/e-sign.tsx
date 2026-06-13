import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FilePenLine, Send, Eye, Clock, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/e-sign")({
  head: () => ({ meta: [{ title: "E‑signatures — Estately" }] }),
  component: ESignPage,
});

type Status = "draft" | "out_for_signature" | "viewed" | "partially_signed" | "completed" | "declined";
type Doc = { id: string; title: string; type: "AST" | "Offer letter" | "Heads of terms" | "Section 21" | "Renewal"; signers: { name: string; role: string; signed: boolean }[]; status: Status; sentAt?: string; completedAt?: string };

const SEED: Doc[] = [
  { id: "ESG-9001", title: "AST — 12 Acacia Avenue", type: "AST", signers: [{ name: "Sarah Mitchell", role: "Tenant", signed: true }, { name: "T. Hargreaves", role: "Landlord", signed: true }], status: "completed", completedAt: "2026-06-08" },
  { id: "ESG-9002", title: "Offer letter — 27 King's Crescent", type: "Offer letter", signers: [{ name: "M. Sutton", role: "Buyer", signed: true }, { name: "R. Patel", role: "Vendor", signed: false }], status: "partially_signed", sentAt: "2026-06-11" },
  { id: "ESG-9003", title: "Renewal — Flat 4, Quay View", type: "Renewal", signers: [{ name: "James Patel", role: "Tenant", signed: false }, { name: "B. Whitehead", role: "Landlord", signed: false }], status: "viewed", sentAt: "2026-06-12" },
  { id: "ESG-9004", title: "Section 21 — Apt 11, The Mill", type: "Section 21", signers: [{ name: "Aisha Khan", role: "Tenant", signed: false }], status: "out_for_signature", sentAt: "2026-06-13" },
  { id: "ESG-9005", title: "Heads of terms — 14 Deansgate (commercial)", type: "Heads of terms", signers: [{ name: "Beech & Co Ltd", role: "Tenant", signed: false }, { name: "Estuary Holdings", role: "Landlord", signed: false }], status: "draft" },
];

const TONE: Record<Status, string> = {
  draft: "bg-muted text-foreground border-muted-foreground/20",
  out_for_signature: "bg-blue-50 text-blue-700 border-blue-200",
  viewed: "bg-amber-50 text-amber-700 border-amber-200",
  partially_signed: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-red-50 text-red-700 border-red-200",
};
const LABEL: Record<Status, string> = { draft: "Draft", out_for_signature: "Out for signature", viewed: "Viewed", partially_signed: "Partially signed", completed: "Completed", declined: "Declined" };

function ESignPage() {
  const [docs, setDocs] = useState(SEED);
  const send = (id: string) => { setDocs((d) => d.map((x) => x.id === id ? { ...x, status: "out_for_signature", sentAt: new Date().toISOString() } : x)); toast.success("Envelope sent — signers notified"); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">E‑signatures</h1>
          <p className="text-muted-foreground mt-1">Send ASTs, offer letters and Section 21 notices for legally binding electronic signature.</p>
        </div>
        <NewEnvelope onCreate={(d) => setDocs([d, ...docs])} />
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat icon={FilePenLine} label="Out for signature" value={String(docs.filter(d => d.status === "out_for_signature" || d.status === "viewed" || d.status === "partially_signed").length)} />
        <Stat icon={CheckCircle2} label="Completed (30d)" value={String(docs.filter(d => d.status === "completed").length)} />
        <Stat icon={Clock} label="Avg turnaround" value="1.4 days" />
        <Stat icon={ShieldCheck} label="eIDAS compliant" value="Yes" />
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Document</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Signers</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Last activity</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const signed = d.signers.filter(s => s.signed).length;
                  return (
                    <tr key={d.id} className="border-t hover:bg-muted/30">
                      <td className="p-3"><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground font-mono">{d.id}</div></td>
                      <td className="p-3"><Badge variant="outline">{d.type}</Badge></td>
                      <td className="p-3 text-xs">
                        <div className="font-medium text-foreground">{signed}/{d.signers.length} signed</div>
                        <div className="text-muted-foreground">{d.signers.map(s => `${s.name} (${s.role})`).join(" · ")}</div>
                      </td>
                      <td className="p-3"><Badge variant="outline" className={TONE[d.status]}>{LABEL[d.status]}</Badge></td>
                      <td className="p-3 text-xs">{d.completedAt ? `Completed ${new Date(d.completedAt).toLocaleDateString("en-GB")}` : d.sentAt ? `Sent ${new Date(d.sentAt).toLocaleDateString("en-GB")}` : "—"}</td>
                      <td className="p-3 text-right">
                        {d.status === "draft" ? (
                          <Button size="sm" onClick={() => send(d.id)}><Send className="h-3.5 w-3.5 mr-1" /> Send</Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost"><Eye className="h-3.5 w-3.5 mr-1" /> Track</Button>
                            <Button size="sm" variant="ghost"><FileText className="h-3.5 w-3.5 mr-1" /> Cert.</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewEnvelope({ onCreate }: { onCreate: (d: Doc) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "AST" as Doc["type"], signer: "", signerRole: "Tenant" });
  const create = () => {
    if (!form.title || !form.signer) { toast.error("Title and signer required"); return; }
    onCreate({ id: `ESG-${Math.floor(Math.random() * 9000) + 1000}`, title: form.title, type: form.type, signers: [{ name: form.signer, role: form.signerRole, signed: false }], status: "draft" });
    setOpen(false);
    toast.success("Envelope created");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><FilePenLine className="h-4 w-4 mr-2" /> New envelope</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create signing envelope</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Document title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="AST — 12 Acacia Avenue" /></Field>
          <Field label="Type">
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Doc["type"] })}>
              {["AST","Offer letter","Heads of terms","Section 21","Renewal"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Signer name"><Input value={form.signer} onChange={(e) => setForm({ ...form, signer: e.target.value })} /></Field>
            <Field label="Role"><Input value={form.signerRole} onChange={(e) => setForm({ ...form, signerRole: e.target.value })} /></Field>
          </div>
        </div>
        <DialogFooter><Button onClick={create}>Create draft</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
function Stat({ icon: Icon, label, value }: { icon: typeof FilePenLine; label: string; value: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4 flex items-center justify-between">
        <div><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><div className="font-display text-2xl font-bold mt-0.5">{value}</div></div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}
