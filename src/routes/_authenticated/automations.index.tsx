import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listTemplates, saveTemplate, toggleTemplateActive, deleteTemplate, TRIGGER_EVENTS, ENTITY_TYPES } from "@/lib/tracks.functions";
import { Plus, Trash2, Workflow, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/automations/")({ component: AutomationsList });

function AutomationsList() {
  const list = useServerFn(listTemplates);
  const save = useServerFn(saveTemplate);
  const toggle = useServerFn(toggleTemplateActive);
  const del = useServerFn(deleteTemplate);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["track-templates"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", trigger_event: "manual", entity_type: "lead" });

  const create = useMutation({
    mutationFn: () => save({ data: { ...form } as any }),
    onSuccess: ({ id }) => {
      setOpen(false);
      toast.success("Track created");
      qc.invalidateQueries({ queryKey: ["track-templates"] });
      navigate({ to: "/automations/$id", params: { id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tracks"
        description="Time-released automated sequences triggered by events"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New track</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New track</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New lead nurture" /></div>
                <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Entity</Label>
                    <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ENTITY_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Trigger</Label>
                    <Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TRIGGER_EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && templates.length === 0 && (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">
          <Workflow className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <div>No tracks yet. Create one to start automating follow-ups.</div>
        </CardContent></Card>
      )}

      <div className="grid gap-2">
        {templates.map((t: any) => (
          <Card key={t.id} className="border-0 shadow-card">
            <CardContent className="p-3 flex items-center gap-3">
              <Workflow className={`h-4 w-4 ${t.is_active ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <Link to="/automations/$id" params={{ id: t.id }} className="font-medium hover:underline">{t.name}</Link>
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  <Badge variant="secondary" className="text-[10px]">{t.entity_type}</Badge>
                  <span>on {t.trigger_event}</span>
                  <span>·</span>
                  <span>{t.steps?.[0]?.count ?? 0} steps</span>
                  <span>·</span>
                  <span>{t.runs?.[0]?.count ?? 0} runs</span>
                </div>
              </div>
              <Switch
                checked={t.is_active}
                onCheckedChange={async (v) => {
                  await toggle({ data: { id: t.id, is_active: v } });
                  qc.invalidateQueries({ queryKey: ["track-templates"] });
                }}
              />
              <Button
                variant="ghost" size="icon"
                onClick={async () => {
                  if (!confirm(`Delete "${t.name}"? Active runs will also be removed.`)) return;
                  await del({ data: { id: t.id } });
                  qc.invalidateQueries({ queryKey: ["track-templates"] });
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <Link to="/automations/$id" params={{ id: t.id }}>
                <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
