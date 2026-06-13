import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileText, Upload, Search, Lock, Download, Trash2, ShieldCheck, Clock, Filter, Building2, User2, Home, Briefcase, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fetchDocumentsData,
  createDocument,
  deleteDocument,
  getDocumentSignedUrl,
  type DocScope,
} from "@/lib/documents.functions";

export const Route = createFileRoute("/_authenticated/documents")({ component: DocumentsPage });

const FOLDERS = ["General", "Compliance", "Tenancies", "Properties", "Finance", "Maintenance", "HR & Agency", "Legal"];

const SCOPE_META: Record<DocScope, { label: string; icon: typeof Home }> = {
  property: { label: "Property", icon: Home },
  landlord: { label: "Landlord", icon: User2 },
  tenant: { label: "Tenant", icon: Users },
  tenancy: { label: "Tenancy", icon: Briefcase },
  agency: { label: "Agency", icon: Building2 },
};

function DocumentsPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchDocumentsData);
  const create = useServerFn(createDocument);
  const del = useServerFn(deleteDocument);
  const sign = useServerFn(getDocumentSignedUrl);
  const { data, isLoading } = useQuery({ queryKey: ["documents"], queryFn: () => load() });

  const [tab, setTab] = useState<"all" | DocScope>("all");
  const [folder, setFolder] = useState<string>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    folder: "General",
    scope: "property" as DocScope,
    scope_id: "",
    expires_on: "",
    retention: "",
    tags: "",
  });

  const docs = data?.documents ?? [];
  const properties = data?.properties ?? [];
  const agencies = data?.agencies ?? [];
  const tenancies = data?.tenancies ?? [];
  const profiles = data?.profiles ?? [];
  const landlords = profiles.filter((p) => p.primary_role === "landlord");
  const tenants = profiles.filter((p) => p.primary_role === "tenant");

  const scopeOptions = useMemo(() => {
    switch (form.scope) {
      case "property": return properties.map((p) => ({ value: p.id, label: p.title }));
      case "landlord": return landlords.map((c: { id: string; full_name: string | null }) => ({ value: c.id, label: c.full_name ?? c.id }));
      case "tenant": return tenants.map((c: { id: string; full_name: string | null }) => ({ value: c.id, label: c.full_name ?? c.id }));
      case "tenancy": return tenancies.map((t) => ({ value: t.id, label: t.tenant_name }));
      case "agency": return agencies.map((a) => ({ value: a.id, label: a.name }));
    }
  }, [form.scope, properties, landlords, tenants, tenancies, agencies]);

  const visible = docs.filter((d) => {
    if (tab !== "all" && d.scope !== tab) return false;
    if (folder !== "All" && d.folder !== folder) return false;
    if (q && !(`${d.name} ${(d.tags || []).join(" ")}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  function scopeLabel(d: typeof docs[number]) {
    if (d.scope === "property") return properties.find((p) => p.id === d.property_id)?.title;
    if (d.scope === "landlord") return landlords.find((c: { id: string }) => c.id === d.landlord_user_id)?.full_name;
    if (d.scope === "tenant") return tenants.find((c: { id: string }) => c.id === d.tenant_user_id)?.full_name;
    if (d.scope === "tenancy") return tenancies.find((t) => t.id === d.tenancy_id)?.tenant_name;
    if (d.scope === "agency") return agencies.find((a) => a.id === d.agency_id)?.name;
    return null;
  }

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Pick a file");
    if (!form.scope_id) return toast.error(`Pick a ${form.scope}`);
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const path = `${auth.user.id}/${form.scope}/${form.scope_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      await create({
        data: {
          name: form.name || file.name,
          folder: form.folder,
          scope: form.scope,
          scope_id: form.scope_id,
          storage_path: path,
          mime_type: file.type,
          size_bytes: file.size,
          expires_on: form.expires_on || null,
          retention: form.retention || null,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        },
      });
      toast.success("Uploaded");
      setOpen(false);
      setForm({ name: "", folder: "General", scope: "property", scope_id: "", expires_on: "", retention: "", tags: "" });
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function download(id: string) {
    try {
      const res = await sign({ data: { id } });
      window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const totalSize = docs.reduce((a, d) => a + (d.size_bytes ?? 0), 0);
  const expiringSoon = docs.filter((d) => d.expires_on && new Date(d.expires_on) < new Date(Date.now() + 90 * 86400000)).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document vault</h1>
          <p className="text-sm text-muted-foreground">Scoped per property, landlord, tenant, tenancy or agency. Encrypted & audit-logged.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" />Upload</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>File</Label><Input ref={fileRef} type="file" /></div>
              <div><Label>Display name (optional)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Leave blank to use filename" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Scope</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as DocScope, scope_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SCOPE_META) as DocScope[]).map((k) => (
                        <SelectItem key={k} value={k}>{SCOPE_META[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Folder</Label>
                  <Select value={form.folder} onValueChange={(v) => setForm({ ...form, folder: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Applies to ({SCOPE_META[form.scope].label.toLowerCase()})</Label>
                <Select value={form.scope_id} onValueChange={(v) => setForm({ ...form, scope_id: v })}>
                  <SelectTrigger><SelectValue placeholder={`Pick a ${form.scope}`} /></SelectTrigger>
                  <SelectContent>
                    {scopeOptions.length === 0
                      ? <SelectItem value="__none" disabled>None available</SelectItem>
                      : scopeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Expires</Label><Input type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} /></div>
                <div><Label>Retention</Label><Input value={form.retention} onChange={(e) => setForm({ ...form, retention: e.target.value })} placeholder="e.g. 6 years" /></div>
              </div>
              <div><Label>Tags (comma-sep)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="CP12, Gas Safe" /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Total documents</span><FileText className="h-4 w-4 text-muted-foreground" /></div><div className="text-2xl font-bold mt-1">{docs.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Storage used</span><ShieldCheck className="h-4 w-4 text-muted-foreground" /></div><div className="text-2xl font-bold mt-1">{(totalSize / 1024 / 1024).toFixed(1)} MB</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Expiring &lt; 90d</span><Clock className="h-4 w-4 text-muted-foreground" /></div><div className={`text-2xl font-bold mt-1 ${expiringSoon ? "text-warning" : ""}`}>{expiringSoon}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Locked</span><Lock className="h-4 w-4 text-muted-foreground" /></div><div className="text-2xl font-bold mt-1">{docs.filter((d) => d.locked).length}</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={folder} onValueChange={setFolder}>
          <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All folders</SelectItem>
            {FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">All ({docs.length})</TabsTrigger>
          {(Object.keys(SCOPE_META) as DocScope[]).map((k) => {
            const Icon = SCOPE_META[k].icon;
            const n = docs.filter((d) => d.scope === k).length;
            return <TabsTrigger key={k} value={k}><Icon className="h-3 w-3 mr-1" />{SCOPE_META[k].label} ({n})</TabsTrigger>;
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="font-medium">No documents</p>
              <p className="text-sm text-muted-foreground">Upload a file and attach it to a property, landlord, tenant, tenancy or your agency.</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {visible.map((d) => {
                    const Icon = SCOPE_META[d.scope as DocScope]?.icon ?? FileText;
                    return (
                      <div key={d.id} className="px-4 py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-center hover:bg-muted/30 transition-colors">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-2">
                            {d.name}
                            {d.locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1 items-center">
                            <Badge variant="secondary" className="text-[10px] py-0"><Icon className="h-3 w-3 mr-1" />{SCOPE_META[d.scope as DocScope]?.label}: {scopeLabel(d) ?? "—"}</Badge>
                            <Badge variant="outline" className="text-[10px] py-0">{d.folder}</Badge>
                            {(d.tags ?? []).map((t: string) => <Badge key={t} variant="outline" className="text-[10px] py-0">{t}</Badge>)}
                            {d.expires_on && <Badge variant="secondary" className="text-[10px] py-0">Expires {new Date(d.expires_on).toLocaleDateString("en-GB")}</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => download(d.id)}><Download className="h-4 w-4" /></Button>
                          {!d.locked && <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
