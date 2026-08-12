import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

type Agency = { id: string; name: string; slug: string; description: string | null; phone: string | null; email: string | null; website: string | null; logo_url: string | null; city: string | null };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export const Route = createFileRoute("/_authenticated/agency")({
  head: () => ({ meta: [{ title: "Agency profile — Estately" }] }),
  component: AgencyPage,
});

function AgencyPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState<Partial<Agency>>({ name: "", description: "", phone: "", email: "", website: "", logo_url: "", city: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("agencies").select("*").eq("owner_id", u.user.id).limit(1).maybeSingle();
    if (data) { setAgency(data as Agency); setForm(data as Agency); } else { setCreating(true); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !form.name) return;
    if (agency) {
      const { error } = await supabase.from("agencies").update({ ...form }).eq("id", agency.id);
      if (error) toast.error(error.message); else { toast.success("Saved"); load(); }
    } else {
      const slug = slugify(form.name) + "-" + Math.random().toString(36).slice(2, 6);
      const { error } = await supabase.from("agencies").insert({ ...form, slug, owner_id: u.user.id, name: form.name });
      if (error) toast.error(error.message); else { toast.success("Agency created"); setCreating(false); load(); }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">{agency ? "Your agency" : "Create your agency"}</h1><p className="text-muted-foreground text-sm">This is your public profile.</p></div>
        {agency && (
          <Button variant="outline" asChild>
            <Link to="/agencies/$slug" params={{ slug: agency.slug }}>View public page <ExternalLink className="ml-2 h-3 w-3" /></Link>
          </Button>
        )}
      </div>
      <Card className="border-0 shadow-card">
        <CardContent className="p-6 space-y-4">
          <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Website</Label><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          <div><Label>Logo URL</Label><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
          <Button onClick={save} disabled={!form.name}>{agency ? "Save changes" : "Create agency"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
