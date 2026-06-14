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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileSignature, Send, ShieldCheck, ScrollText, Search, Wand2, Copy, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fetchTemplates, updateInstanceStatus } from "@/lib/persistence.functions";
import { prefillTemplateValues, sendForSignature } from "@/lib/contracts.functions";

export const Route = createFileRoute("/_authenticated/templates")({ component: TemplatesPage });

type Field = { key: string; label: string; type: string; required?: boolean; options?: string[] };
type Template = { id: string; code: string; name: string; category: string; jurisdiction: string; authority: string | null; description: string | null; pages: number; signers: string[]; fields: Field[]; is_system: boolean; body: string };
type Instance = { id: string; template_id: string; status: string; sent_at: string | null; signed_at: string | null; created_at: string; expires_on: string | null; title: string | null; values: any };
type Signer = { role: string; name: string; email: string };

function TemplatesPage() {
  const qc = useQueryClient();
  const load = useServerFn(fetchTemplates);
  const prefill = useServerFn(prefillTemplateValues);
  const send = useServerFn(sendForSignature);
  const setStatus = useServerFn(updateInstanceStatus);
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: () => load() });

  const templates = (data?.templates ?? []) as unknown as Template[];
  const instances = (data?.instances ?? []) as unknown as Instance[];
  const signatures = data?.signatures ?? [];
  const properties = data?.properties ?? [];
  const tenancies = data?.tenancies ?? [];
  const contacts = data?.contacts ?? [];
  const bookings = data?.bookings ?? [];

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [active, setActive] = useState<Template | null>(null);
  const [propertyId, setPropertyId] = useState<string>("");
  const [tenancyId, setTenancyId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");
  const [values, setValues] = useState<Record<string, any>>({});
  const [signers, setSigners] = useState<Signer[]>([]);
  const [expiresOn, setExpiresOn] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [sentLinks, setSentLinks] = useState<Array<{ token: string; signer_name: string; signer_email: string }> | null>(null);

  const categories = useMemo(() => Array.from(new Set(templates.map(t => t.category))).sort(), [templates]);
  const filtered = useMemo(() => templates.filter(t =>
    (cat === "all" || t.category === cat) &&
    (!q.trim() || `${t.name} ${t.description ?? ""} ${t.authority ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [templates, q, cat]);

  const open = (t: Template) => {
    setActive(t);
    setPropertyId(""); setTenancyId(""); setContactId(""); setBookingId("");
    const initial: Record<string, any> = {};
    (t.fields || []).forEach(f => { initial[f.key] = ""; });
    setValues(initial);
    setSigners((t.signers || []).map((r) => ({ role: r, name: "", email: "" })));
    setExpiresOn("");
    setSentLinks(null);
  };

  const autofill = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const res = await prefill({ data: {
        property_id: propertyId || null,
        tenancy_id: tenancyId || null,
        contact_id: contactId || null,
        booking_id: bookingId || null,
      } });
      setValues((v) => ({ ...v, ...res.values }));
      // merge suggested signers into existing slots by role
      setSigners((curr) => curr.map((s) => {
        const m = res.suggested_signers.find((x: any) => x.role.toLowerCase().includes(s.role.toLowerCase()) || s.role.toLowerCase().includes(x.role.toLowerCase()));
        return m ? { ...s, name: s.name || m.name, email: s.email || m.email } : s;
      }));
      toast.success("Pulled details from system");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  const doSend = async () => {
    if (!active) return;
    if (signers.some((s) => !s.name.trim() || !s.email.trim())) { toast.error("Fill all signer names and emails"); return; }
    setBusy(true);
    try {
      const res = await send({ data: {
        template_id: active.id,
        title: active.name,
        property_id: propertyId || null,
        tenancy_id: tenancyId || null,
        contact_id: contactId || null,
        booking_id: bookingId || null,
        values,
        expires_on: expiresOn || null,
        signers,
      } });
      setSentLinks(res.signing_links as any);
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Sent for signing");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const markVoid = async (id: string) => {
    await setStatus({ data: { id, status: "void" } });
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Contracts & templates" description="UK-compliant tenancy, sales, holiday-let and operations contracts with built-in e-signature" />

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
                    <Button size="sm" className="w-full" onClick={() => open(t)}>Generate & send</Button>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && <div className="col-span-3 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">No templates match</div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-2">
          {instances.length === 0 && <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">No documents generated yet</div>}
          {instances.map((i: any) => {
            const t = templates.find(x => x.id === i.template_id);
            const sigs = signatures.filter((s: any) => s.instance_id === i.id);
            return (
              <Card key={i.id} className="border-0 shadow-card">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{i.title || t?.name || "Template"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(i.created_at).toLocaleString("en-GB")}
                        {i.expires_on && <> · expires {new Date(i.expires_on).toLocaleDateString("en-GB")}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={i.status === "signed" ? "default" : i.status === "sent" ? "secondary" : i.status === "void" ? "destructive" : "outline"} className="text-[10px] capitalize">{i.status}</Badge>
                      {i.status !== "signed" && i.status !== "void" && <Button size="sm" variant="ghost" onClick={() => markVoid(i.id)}><Trash2 className="h-3 w-3" /></Button>}
                    </div>
                  </div>
                  {sigs.length > 0 && (
                    <div className="space-y-1">
                      {sigs.map((s: any) => (
                        <div key={s.token} className="flex items-center gap-2 text-xs">
                          <Badge variant={s.status === "signed" ? "default" : "outline"} className="text-[10px] capitalize">{s.status}</Badge>
                          <span className="font-medium">{s.signer_name}</span>
                          <span className="text-muted-foreground">({s.signer_role})</span>
                          {s.status !== "signed" && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] ml-auto" onClick={() => copyLink(s.token)}>
                              <Copy className="h-3 w-3 mr-1" /> Copy link
                            </Button>
                          )}
                          {s.signed_at && <span className="text-muted-foreground ml-auto">{new Date(s.signed_at).toLocaleString("en-GB")}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={(v) => { if (!v) { setActive(null); setSentLinks(null); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{active?.name}</DialogTitle></DialogHeader>

          {!sentLinks && active && (
            <div className="space-y-4">
              {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}

              {/* Entity picker */}
              <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>Auto-fill from system data</span>
                  <Button size="sm" variant="outline" onClick={autofill} disabled={busy}><Wand2 className="h-3 w-3 mr-1" /> Pull details</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Property</Label>
                    <Select value={propertyId} onValueChange={setPropertyId}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title || p.address}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Tenancy</Label>
                    <Select value={tenancyId} onValueChange={setTenancyId}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{tenancies.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Contact</Label>
                    <Select value={contactId} onValueChange={setContactId}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name} {c.contact_type ? `· ${c.contact_type}` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Holiday booking</Label>
                    <Select value={bookingId} onValueChange={setBookingId}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{bookings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.guest_name} ({b.check_in})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                <div className="text-xs font-semibold">Contract details</div>
                {(active.fields ?? []).map(f => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
                    {f.type === "textarea" ? (
                      <Textarea rows={2} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
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

              {/* Signers */}
              <div className="space-y-2">
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>Signers ({signers.length})</span>
                  <Button size="sm" variant="ghost" onClick={() => setSigners([...signers, { role: "party", name: "", email: "" }])}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                {signers.map((s, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr_1fr_auto] gap-2 items-end">
                    <Input className="h-8 text-xs" value={s.role} onChange={(e) => { const c = [...signers]; c[i].role = e.target.value; setSigners(c); }} placeholder="Role" />
                    <Input className="h-8" value={s.name} onChange={(e) => { const c = [...signers]; c[i].name = e.target.value; setSigners(c); }} placeholder="Full name" />
                    <Input className="h-8" type="email" value={s.email} onChange={(e) => { const c = [...signers]; c[i].email = e.target.value; setSigners(c); }} placeholder="email@example.com" />
                    <Button size="sm" variant="ghost" onClick={() => setSigners(signers.filter((_, x) => x !== i))}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>

              {/* Expiry */}
              <div>
                <Label className="text-xs">Contract expires on (for reminders)</Label>
                <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
              </div>
            </div>
          )}

          {sentLinks && (
            <div className="space-y-3">
              <div className="text-sm">Signing links generated. Share each with the corresponding signer.</div>
              {sentLinks.map((l) => (
                <Card key={l.token} className="border">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{l.signer_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.signer_email}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyLink(l.token)}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(`/sign/${l.token}`, "_blank")}><ExternalLink className="h-3 w-3" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!sentLinks ? (
              <Button onClick={doSend} disabled={busy}><Send className="h-3 w-3 mr-1" /> Generate & send</Button>
            ) : (
              <Button onClick={() => { setActive(null); setSentLinks(null); }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
