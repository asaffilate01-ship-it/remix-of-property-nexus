import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/compliance")({
  head: () => ({ meta: [{ title: "Compliance — Estately" }] }),
  component: CompliancePage,
});

type Rule = { type: string; label: string; scope: string; renewal_months: number | null; description: string | null; authority: string | null };
type Property = { id: string; address: string | null; city: string | null };
type Record = { id: string; type: string; issued_on: string | null; expires_on: string | null; status: string; reference: string | null; notes: string | null; property_id: string | null; document_url: string | null };

const empty = { type: "", issued_on: "", expires_on: "", status: "valid", reference: "", notes: "", property_id: "" };

function CompliancePage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, c, p] = await Promise.all([
      supabase.from("compliance_rules").select("*").order("label"),
      supabase.from("compliance_records").select("*").order("expires_on", { ascending: true, nullsFirst: false }),
      supabase.from("properties").select("id, address, city"),
    ]);
    if (c.error) toast.error(c.error.message);
    setRules((r.data as any) ?? []); setRecords((c.data as any) ?? []); setProperties((p.data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const ruleByType = useMemo(() => new Map(rules.map((r) => [r.type, r])), [rules]);

  const now = Date.now();
  const expiringSoon = (d: string | null) => d && new Date(d).getTime() - now < 30 * 86400000 && new Date(d).getTime() > now;
  const expired = (d: string | null) => d && new Date(d).getTime() < now;

  const stats = useMemo(() => ({
    total: records.length,
    expired: records.filter((r) => expired(r.expires_on)).length,
    soon: records.filter((r) => expiringSoon(r.expires_on)).length,
    valid: records.filter((r) => r.expires_on && new Date(r.expires_on).getTime() - now > 30 * 86400000).length,
  }), [records, now]);

  const save = async () => {
    if (!form.type || !form.property_id) return toast.error("Type and property required");
    setSaving(true);
    const payload: any = {
      type: form.type, property_id: form.property_id,
      issued_on: form.issued_on || null, expires_on: form.expires_on || null,
      status: form.status, reference: form.reference || null, notes: form.notes || null,
    };
    const { error } = await supabase.from("compliance_records").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Record added");
    setOpen(false); setForm(empty); void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from("compliance_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Compliance" description="EPC, gas, electrical, HMO and other statutory certificates." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add certificate</Button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total records", value: stats.total, color: "text-foreground" },
          { label: "Expired", value: stats.expired, color: "text-red-600" },
          { label: "Expiring < 30 days", value: stats.soon, color: "text-amber-600" },
          { label: "Valid", value: stats.valid, color: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-card"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{s.label}</div><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div></CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}</div>
      ) : records.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><ShieldCheck className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No compliance records yet.</div></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-3">Type</th><th className="text-left p-3">Property</th><th className="text-left p-3">Issued</th><th className="text-left p-3">Expires</th><th className="text-left p-3">Status</th><th></th></tr></thead>
              <tbody>
                {records.map((r) => {
                  const prop = r.property_id ? propById.get(r.property_id) : null;
                  const rule = ruleByType.get(r.type);
                  const isExpired = expired(r.expires_on);
                  const isSoon = expiringSoon(r.expires_on);
                  return (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3"><div className="font-medium">{rule?.label ?? r.type}</div>{r.reference && <div className="text-xs text-muted-foreground">{r.reference}</div>}</td>
                      <td className="p-3 text-xs text-muted-foreground">{prop ? [prop.address, prop.city].filter(Boolean).join(", ") : "—"}</td>
                      <td className="p-3 text-xs">{r.issued_on ? new Date(r.issued_on).toLocaleDateString() : "—"}</td>
                      <td className="p-3 text-xs">{r.expires_on ? new Date(r.expires_on).toLocaleDateString() : "—"}</td>
                      <td className="p-3">{isExpired ? <Badge className="bg-red-50 text-red-700 border-red-200 border" variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />expired</Badge> : isSoon ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 border" variant="outline">expiring</Badge> : <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border" variant="outline">{r.status}</Badge>}</td>
                      <td className="p-3 text-right"><Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add certificate</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type *</Label>
              <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{rules.map((r) => <SelectItem key={r.type} value={r.type}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["valid","expiring","expired","missing"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Property *</Label>
              <Select value={form.property_id} onValueChange={(val) => setForm({ ...form, property_id: val })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{[p.address, p.city].filter(Boolean).join(", ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Issued on</Label><Input type="date" value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} /></div>
            <div><Label>Expires on</Label><Input type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} /></div>
            <div className="col-span-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
