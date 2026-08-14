import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, FilePenLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { listSigningRequests, sendForSignature } from "@/lib/contracts.functions";

export const Route = createFileRoute("/_authenticated/e-sign")({
  head: () => ({ meta: [{ title: "E-signatures — Estately" }] }),
  component: ESignPage,
});

type TemplateOption = { id: string; name: string };
const blank = { templateId: "", title: "", name: "", email: "", role: "tenant", expiresOn: "" };

function ESignPage() {
  const list = useServerFn(listSigningRequests);
  const send = useServerFn(sendForSignature);
  const query = useQuery({ queryKey: ["signing-requests"], queryFn: () => list() });
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    void supabase.from("templates").select("id, name").eq("active", true).order("name").then(({ data, error }) => {
      if (error) toast.error(error.message);
      else setTemplates(data ?? []);
    });
  }, []);

  const createRequest = async () => {
    if (!form.templateId || !form.name.trim() || !form.email.trim()) {
      toast.error("Choose a template and enter the signer's name and email");
      return;
    }
    setSaving(true);
    try {
      const result = await send({ data: {
        template_id: form.templateId,
        title: form.title.trim() || null,
        values: {},
        expires_on: form.expiresOn || null,
        signers: [{ role: form.role, name: form.name.trim(), email: form.email.trim() }],
      } });
      if (result.delivery === "queued") toast.success("Signing request queued for email delivery");
      else toast.warning("Signing link created, but email delivery is unavailable. Copy and share the secure link manually.");
      setOpen(false);
      setForm(blank);
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create signing request");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/sign/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Secure signing link copied");
    } catch {
      toast.error("Copy failed. Open the link and copy it from the address bar.");
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  const rows = query.data?.requests ?? [];
  return (
    <div className="space-y-6">
      <PageHeader
        title="E-signatures"
        description="Email secure, expiring signing links and track delivery and signer progress. You can still copy a link when a manual fallback is needed."
        actions={<Button onClick={() => setOpen(true)} disabled={!templates.length}><Plus className="mr-2 h-4 w-4" />New request</Button>}
      />

      {query.isLoading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> : rows.length === 0 ? (
        <Card className="border-dashed bg-transparent"><CardContent className="py-12 text-center text-muted-foreground"><FilePenLine className="mx-auto mb-3 h-10 w-10 opacity-40" /><div>No signing requests yet.</div><div className="mt-1 text-xs">Create a document template first, then issue its secure signing link here.</div></CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((request) => (
            <Card key={request.id}>
              <CardContent className="space-y-4 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="truncate font-semibold">{request.title || request.templates?.name || "Document"}</div><div className="text-xs text-muted-foreground">Created {new Date(request.created_at).toLocaleDateString("en-GB")}{request.expires_on ? ` · expires ${new Date(request.expires_on).toLocaleDateString("en-GB")}` : ""}</div></div>
                  <Status status={request.status} />
                </div>
                <div className="space-y-2">
                  {(request.template_signatures ?? []).map((signer) => (
                    <div key={signer.id} className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{signer.signer_name}</div><div className="truncate text-xs text-muted-foreground">{signer.signer_email} · {signer.signer_role}</div></div>
                      <div className="flex items-center gap-2"><Badge variant={signer.status === "signed" ? "default" : "secondary"}>{signer.status}</Badge>{signer.status === "pending" && <Button size="sm" variant="outline" onClick={() => copyLink(signer.token)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy link</Button>}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New signing request</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Template</Label><Select value={form.templateId} onValueChange={(templateId) => setForm({ ...form, templateId })}><SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label>Document title</Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={200} placeholder="12 High Street tenancy agreement" /></div>
            <div><Label>Signer name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={200} /></div>
            <div><Label>Signer email</Label><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={255} /></div>
            <div><Label>Signer role</Label><Input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} maxLength={40} /></div>
            <div><Label>Expires on</Label><Input type="date" value={form.expiresOn} onChange={(event) => setForm({ ...form, expiresOn: event.target.value })} min={new Date().toISOString().slice(0, 10)} /></div>
          </div>
          <DialogFooter><Button onClick={createRequest} disabled={saving}>{saving ? "Creating…" : "Create secure link"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Status({ status }: { status: string }) {
  if (status === "signed") return <Badge className="bg-emerald-600">Signed</Badge>;
  if (status === "void") return <Badge variant="destructive">Void</Badge>;
  if (status === "delivery_queued") return <Badge variant="outline">Email queued</Badge>;
  if (status === "sent") return <Badge variant="secondary">Sent</Badge>;
  return <Badge variant="outline">Ready to share</Badge>;
}
