import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileSignature, Send, ShieldCheck, ScrollText, Search } from "lucide-react";
import { toast } from "sonner";
import { fetchTemplates, createTemplateInstance, updateInstanceStatus } from "@/lib/persistence.functions";

export const Route = createFileRoute("/_authenticated/templates")({ component: TemplatesPage });

type Field = { key: string; label: string; type: string; required?: boolean; options?: string[] };
type Template = { id: string; code: string; name: string; category: string; jurisdiction: string; authority: string | null; description: string | null; pages: number; signers: string[]; fields: Field[]; is_system: boolean };
type Instance = { id: string; template_id: string; status: string; sent_at: string | null; signed_at: string | null; created_at: string; values: any };

function TemplatesPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchTemplates);
  const create = useServerFn(createTemplateInstance);
  const setStatus = useServerFn(updateInstanceStatus);
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: () => load() });
  const templates = (data?.templates ?? []) as Template[];
  const instances = (data?.instances ?? []) as Instance[];
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [active, setActive] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});

  const categories = useMemo(() => Array.from(new Set(templates.map(t => t.category))).sort(), [templates]);
  const filtered = useMemo(() => templates.filter(t =>
    (cat === "all" || t.category === cat) &&
    (!q.trim() || `${t.name} ${t.description ?? ""} ${t.authority ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [templates, q, cat]);

  const open = (t: Template) => {
    setActive(t);
    const initial: Record<string, any> = {};
    (t.fields || []).forEach(f => { initial[f.key] = ""; });
    setValues(initial);
  };

  const sendDraft = async (status: "draft" | "sent") => {
    if (!active) return;
    try {
      await create({ data: { template_id: active.id, values, status } });
      toast.success(status === "sent" ? "Sent" : "Saved as draft");
      setActive(null);
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const markSigned = async (id: string) => {
    await setStatus({ data: { id, status: "signed" } });
    toast.success("Marked signed");
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Document templates" description="UK-compliant letting, sales and compliance templates" />

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library"><ScrollText className="h-3 w-3 mr-1" /> Library ({templates.length})</TabsTrigger>
          <TabsTrigger value="instances"><FileSignature className="h-3 w-3 mr-1" /> Generated ({instances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="pl-8" />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map(t => (
                <Card key={t.id} className="border-0 shadow-card hover:shadow-elev transition-shadow">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold leading-tight">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.jurisdiction} · {t.pages}pp</div>
                      </div>
                      {t.is_system && <Badge variant="outline" className="text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> System</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                    {t.authority && <div className="text-[11px] text-muted-foreground italic">{t.authority}</div>}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                      {(t.signers ?? []).map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                    </div>
                    <Button size="sm" className="w-full" onClick={() => open(t)}>Generate</Button>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && <div className="col-span-3 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">No templates match</div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-2">
          {instances.length === 0 && <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">No documents generated yet</div>}
          {instances.map(i => {
            const t = templates.find(x => x.id === i.template_id);
            return (
              <Card key={i.id} className="border-0 shadow-card">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{t?.name ?? "Template"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString("en-GB")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={i.status === "signed" ? "default" : i.status === "sent" ? "secondary" : "outline"} className="text-[10px] capitalize">{i.status}</Badge>
                    {i.status !== "signed" && i.status !== "void" && <Button size="sm" variant="outline" onClick={() => markSigned(i.id)}>Mark signed</Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={(v) => { if (!v) setActive(null); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{active?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {active?.description && <p className="text-sm text-muted-foreground">{active.description}</p>}
            {(active?.fields ?? []).length === 0 && <p className="text-xs text-muted-foreground">This template has no required fields. You can generate it directly.</p>}
            {(active?.fields ?? []).map(f => (
              <div key={f.key}>
                <Label>{f.label} {f.required && "*"}</Label>
                {f.type === "textarea" ? (
                  <Textarea rows={3} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                ) : f.type === "select" && f.options ? (
                  <Select value={values[f.key] ?? ""} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => sendDraft("draft")}>Save draft</Button>
            <Button onClick={() => sendDraft("sent")}><Send className="h-3 w-3 mr-1" /> Generate & send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
