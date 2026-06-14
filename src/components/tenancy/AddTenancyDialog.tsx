import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Property = { id: string; address: string | null; city: string | null; postcode: string | null };

export function AddTenancyDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [props, setProps] = useState<Property[]>([]);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    property_id: "",
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    start_date: today,
    end_date: "",
    rent_amount: "",
    rent_frequency: "monthly" as "monthly" | "weekly",
    deposit: "",
    notes: "",
    status: "active" as "draft" | "active",
  });

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await supabase.from("properties").select("id,address,city,postcode").order("created_at", { ascending: false });
      setProps((data as Property[]) ?? []);
    })();
  }, [open]);

  const u = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });

  const submit = async () => {
    if (!f.property_id) return toast.error("Pick a property");
    if (!f.tenant_name.trim()) return toast.error("Tenant name required");
    if (!f.rent_amount) return toast.error("Rent amount required");
    setSaving(true);
    // Create or find a tenant row first so tenancies link to a real tenant record.
    let tenantId: string | null = null;
    const { data: existing } = await supabase
      .from("tenants").select("id")
      .ilike("full_name", f.tenant_name.trim())
      .limit(1).maybeSingle();
    if (existing?.id) {
      tenantId = existing.id;
    } else {
      const { data: newT } = await supabase.from("tenants").insert({
        full_name: f.tenant_name.trim(),
        email: f.tenant_email || null,
        phone: f.tenant_phone || null,
      }).select("id").single();
      tenantId = newT?.id ?? null;
    }
    const { error } = await supabase.from("tenancies").insert({
      property_id: f.property_id,
      tenant_id: tenantId,
      tenant_name: f.tenant_name.trim(),
      tenant_email: f.tenant_email || null,
      tenant_phone: f.tenant_phone || null,
      start_date: f.start_date,
      end_date: f.end_date || null,
      rent_amount: Number(f.rent_amount),
      rent_frequency: f.rent_frequency,
      deposit: f.deposit ? Number(f.deposit) : 0,
      notes: f.notes || null,
      status: f.status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tenancy added");
    await qc.invalidateQueries({ queryKey: ["tenancies-overview"] });
    setOpen(false);
    setF({ ...f, tenant_name: "", tenant_email: "", tenant_phone: "", rent_amount: "", deposit: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Add tenancy</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New tenancy</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Property *</Label>
            <Select value={f.property_id} onValueChange={(v) => u("property_id", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder={props.length ? "Choose property" : "No properties — add one first"} /></SelectTrigger>
              <SelectContent>
                {props.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{[p.address, p.city, p.postcode].filter(Boolean).join(", ") || p.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tenant name *</Label><Input value={f.tenant_name} onChange={(e) => u("tenant_name", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={f.tenant_email} onChange={(e) => u("tenant_email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={f.tenant_phone} onChange={(e) => u("tenant_phone", e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => u("status", v as "draft" | "active")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start date *</Label><Input type="date" value={f.start_date} onChange={(e) => u("start_date", e.target.value)} /></div>
            <div><Label>End date</Label><Input type="date" value={f.end_date} onChange={(e) => u("end_date", e.target.value)} /></div>
            <div><Label>Rent *</Label><Input type="number" value={f.rent_amount} onChange={(e) => u("rent_amount", e.target.value)} /></div>
            <div>
              <Label>Frequency</Label>
              <Select value={f.rent_frequency} onValueChange={(v) => u("rent_frequency", v as "monthly" | "weekly")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Deposit</Label><Input type="number" value={f.deposit} onChange={(e) => u("deposit", e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => u("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || !f.property_id || !f.tenant_name || !f.rent_amount}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Create tenancy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
