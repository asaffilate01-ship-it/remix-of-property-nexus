import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ScrollText, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — Estately" }] }),
  component: TemplatesPage,
});

type Template = { id: string; code: string | null; name: string; category: string | null; jurisdiction: string | null; authority: string | null; description: string | null; pages: number | null; is_system: boolean; active: boolean; version: number };

const empty = { name: "", category: "tenancy", code: "", jurisdiction: "england_wales", description: "", body: "" };

function TemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("templates").select("*").eq("active", true).order("category").order("name");
    if (error) toast.error(error.message);
    setRows((data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => rows.filter((r) =>
    (cat === "all" || r.category === cat) &&
    (!q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.description ?? "").toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, cat]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: ag } = await supabase.from("agencies").select("id").eq("owner_id", u.user?.id ?? "").maybeSingle();
    const payload: any = {
      agency_id: ag?.id ?? null,
      name: form.name.trim(), category: form.category, code: form.code || null,
      jurisdiction: form.jurisdiction, description: form.description || null, body: form.body || null,
      is_system: false, active: true, version: 1, created_by: u.user?.id ?? null,
    };
    const { error } = await supabase.from("templates").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Template created");
    setOpen(false); setForm(empty); void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this template?")) return;
    const { error } = await supabase.from("templates").update({ active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Document templates" description="Tenancy agreements, notices, letters and other reusable documents." actions={
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New template</Button>
      } />

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} templates</div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><ScrollText className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>{rows.length === 0 ? "No templates yet." : "No matches."}</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 opacity-60" />{t.name}</div>
                    {t.code && <div className="text-xs text-muted-foreground">{t.code}</div>}
                  </div>
                  {t.is_system ? <Badge variant="secondary">System</Badge> : <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {t.category && <Badge variant="outline" className="font-normal">{t.category}</Badge>}
                  {t.jurisdiction && <Badge variant="outline" className="font-normal">{t.jurisdiction.replace("_"," ")}</Badge>}
                  {t.authority && <Badge variant="outline" className="font-normal">{t.authority}</Badge>}
                  <Badge variant="outline" className="font-normal">v{t.version}</Badge>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-3">{t.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New template</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div className="col-span-2"><Label>Jurisdiction</Label>
              <Select value={form.jurisdiction} onValueChange={(val) => setForm({ ...form, jurisdiction: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["england_wales","scotland","northern_ireland","other"].map((j) => <SelectItem key={j} value={j}>{j.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="col-span-2"><Label>Body (markdown / merge fields)</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
