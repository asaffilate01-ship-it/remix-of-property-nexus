import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const types = ["hmo_licence","gas_safety","eicr","epc","fire_alarm","legionella","pat","insurance","deposit_protection"] as const;
type Rec = { id: string; property_id: string; type: typeof types[number]; expires_on: string | null; status: "valid"|"due_soon"|"expired"|"missing"; notes: string | null };
type Prop = { id: string; title: string };

export const Route = createFileRoute("/_authenticated/compliance")({ component: CompliancePage });

function computeStatus(expires_on: string | null): Rec["status"] {
  if (!expires_on) return "missing";
  const d = new Date(expires_on).getTime();
  const now = Date.now();
  if (d < now) return "expired";
  if (d - now < 30 * 86400000) return "due_soon";
  return "valid";
}

function CompliancePage() {
  const [rows, setRows] = useState<Rec[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", type: "gas_safety" as typeof types[number], expires_on: "", notes: "" });

  const load = async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("compliance_records").select("*").order("expires_on", { ascending: true }),
      supabase.from("properties").select("id, title"),
    ]);
    setRows((r as Rec[]) ?? []);
    setProps((p as Prop[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const status = computeStatus(form.expires_on || null);
    const { error } = await supabase.from("compliance_records").insert({
      property_id: form.property_id, type: form.type, expires_on: form.expires_on || null, status, notes: form.notes || null,
    });
    if (error) toast.error(error.message); else { toast.success("Record added"); setOpen(false); setForm({ property_id: "", type: "gas_safety", expires_on: "", notes: "" }); load(); }
  };

  const statusBadge = (s: Rec["status"]) => {
    const map = { valid: "bg-success text-success-foreground", due_soon: "bg-warning text-warning-foreground", expired: "bg-destructive text-destructive-foreground", missing: "bg-muted text-muted-foreground" };
    return <Badge className={map[s]}>{s.replace("_", " ")}</Badge>;
  };

  const summary = { valid: rows.filter((r) => r.status === "valid").length, due_soon: rows.filter((r) => r.status === "due_soon").length, expired: rows.filter((r) => r.status === "expired").length };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Compliance</h1><p className="text-muted-foreground text-sm">HMO licences and safety certificates.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button disabled={props.length === 0}><Plus className="mr-2 h-4 w-4" /> Add record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New compliance record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Property</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a property" /></SelectTrigger>
                  <SelectContent>{props.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof types[number] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Expires on</Label><Input type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={!form.property_id}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4"><ShieldCheck className="h-5 w-5 text-success mb-1" /><div className="text-2xl font-bold">{summary.valid}</div><div className="text-xs text-muted-foreground">Valid</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><AlertTriangle className="h-5 w-5 text-warning mb-1" /><div className="text-2xl font-bold">{summary.due_soon}</div><div className="text-xs text-muted-foreground">Due soon</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4"><AlertTriangle className="h-5 w-5 text-destructive mb-1" /><div className="text-2xl font-bold">{summary.expired}</div><div className="text-xs text-muted-foreground">Expired</div></CardContent></Card>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground">No records yet.{props.length === 0 && " Add a property first."}</CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card">
          <CardContent className="p-0">
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{r.type.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{props.find((p) => p.id === r.property_id)?.title ?? "—"}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{r.expires_on ? `Expires ${new Date(r.expires_on).toLocaleDateString()}` : "No expiry"}</div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
