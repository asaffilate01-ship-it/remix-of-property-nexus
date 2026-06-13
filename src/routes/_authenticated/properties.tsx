import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

type Property = { id: string; title: string; address: string | null; city: string | null; postcode: string | null; bedrooms: number | null; is_hmo: boolean; hmo_licence_expires: string | null };

export const Route = createFileRoute("/_authenticated/properties")({ component: PropertiesPage });

function PropertiesPage() {
  const [rows, setRows] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", address: "", city: "", postcode: "", bedrooms: "", is_hmo: false });

  const load = async () => {
    const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    setRows((data as Property[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("properties").insert({
      owner_id: u.user.id,
      title: form.title,
      address: form.address || null,
      city: form.city || null,
      postcode: form.postcode || null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      is_hmo: form.is_hmo,
    });
    if (error) toast.error(error.message);
    else { toast.success("Property added"); setOpen(false); setForm({ title: "", address: "", city: "", postcode: "", bedrooms: "", is_hmo: false }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Properties</h1><p className="text-muted-foreground text-sm">Your portfolio.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add property</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add property</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>Postcode</Label><Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></div>
              </div>
              <div><Label>Bedrooms</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_hmo} onCheckedChange={(v) => setForm({ ...form, is_hmo: v })} /><Label>HMO property</Label></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={!form.title}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div>No properties yet. Add your first one above.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <Card key={p.id} className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold">{p.title}</div>
                  {p.is_hmo && <Badge className="bg-accent text-accent-foreground">HMO</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">{[p.address, p.city, p.postcode].filter(Boolean).join(", ") || "No address"}</div>
                {p.bedrooms != null && <div className="text-xs text-muted-foreground mt-1">{p.bedrooms} bedrooms</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
