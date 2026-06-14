import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTemplate, saveTemplate, saveSteps, TRIGGER_EVENTS, ENTITY_TYPES, ACTION_TYPES, DELAY_UNITS } from "@/lib/tracks.functions";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/automations/$id")({ component: TemplateEditor });

type StepDraft = {
  step_order: number;
  delay_amount: number;
  delay_unit: "minutes" | "hours" | "days";
  action_type: typeof ACTION_TYPES[number];
  action_config: Record<string, any>;
};

function TemplateEditor() {
  const { id } = Route.useParams();
  const get = useServerFn(getTemplate);
  const save = useServerFn(saveTemplate);
  const persistSteps = useServerFn(saveSteps);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["track-template", id], queryFn: () => get({ data: { id } }) });

  const [meta, setMeta] = useState({ name: "", description: "", trigger_event: "manual", entity_type: "lead", is_active: true });
  const [steps, setSteps] = useState<StepDraft[]>([]);

  useEffect(() => {
    if (data?.template) {
      setMeta({
        name: data.template.name,
        description: data.template.description ?? "",
        trigger_event: data.template.trigger_event,
        entity_type: data.template.entity_type,
        is_active: data.template.is_active,
      });
      setSteps((data.steps ?? []).map((s: any) => ({
        step_order: s.step_order,
        delay_amount: s.delay_amount,
        delay_unit: s.delay_unit,
        action_type: s.action_type,
        action_config: s.action_config ?? {},
      })));
    }
  }, [data]);

  const saveAll = useMutation({
    mutationFn: async () => {
      await save({ data: { id, ...meta } as any });
      await persistSteps({ data: { template_id: id, steps: steps.map((s, i) => ({ ...s, step_order: i + 1 })) } });
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["track-template", id] });
      qc.invalidateQueries({ queryKey: ["track-templates"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const addStep = () => setSteps((s) => [...s, { step_order: s.length + 1, delay_amount: 1, delay_unit: "days", action_type: "send_email", action_config: {} }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => setSteps((s) => {
    const next = [...s];
    const j = i + dir;
    if (j < 0 || j >= next.length) return s;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const updateStep = (i: number, patch: Partial<StepDraft>) => setSteps((s) => s.map((st, idx) => idx === i ? { ...st, ...patch } : st));
  const updateCfg = (i: number, key: string, val: any) => setSteps((s) => s.map((st, idx) => idx === i ? { ...st, action_config: { ...st.action_config, [key]: val } } : st));

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={meta.name || "Edit track"}
        description="Configure trigger and ordered steps"
        actions={
          <div className="flex gap-2">
            <Link to="/automations"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
            <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Name</Label><Input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Entity</Label>
                <Select value={meta.entity_type} onValueChange={(v) => setMeta({ ...meta, entity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITY_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Trigger</Label>
                <Select value={meta.trigger_event} onValueChange={(v) => setMeta({ ...meta, trigger_event: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGER_EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Steps</h3>
          <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3 w-3 mr-1" /> Add step</Button>
        </div>
        {steps.length === 0 && <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">No steps yet</CardContent></Card>}
        {steps.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono bg-muted rounded px-2 py-0.5">#{i + 1}</div>
                <span className="text-sm text-muted-foreground">Wait</span>
                <Input type="number" min={0} className="w-20" value={s.delay_amount} onChange={(e) => updateStep(i, { delay_amount: Number(e.target.value) })} />
                <Select value={s.delay_unit} onValueChange={(v) => updateStep(i, { delay_unit: v as any })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{DELAY_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">then</span>
                <Select value={s.action_type} onValueChange={(v) => updateStep(i, { action_type: v as any, action_config: {} })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTION_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex-1" />
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === steps.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeStep(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>

              <StepConfigFields step={s} updateCfg={(k, v) => updateCfg(i, k, v)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StepConfigFields({ step, updateCfg }: { step: StepDraft; updateCfg: (k: string, v: any) => void }) {
  const cfg = step.action_config;
  switch (step.action_type) {
    case "send_email":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input placeholder="Recipient email (or {{contact.email}})" value={cfg.to_email ?? ""} onChange={(e) => updateCfg("to_email", e.target.value)} />
          <Input placeholder="Subject" value={cfg.subject ?? ""} onChange={(e) => updateCfg("subject", e.target.value)} />
          <Textarea className="md:col-span-2" rows={3} placeholder="Body (HTML or plain text)" value={cfg.body ?? ""} onChange={(e) => updateCfg("body", e.target.value)} />
        </div>
      );
    case "send_sms":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input placeholder="Phone number" value={cfg.phone ?? ""} onChange={(e) => updateCfg("phone", e.target.value)} />
          <Input placeholder="Message" value={cfg.message ?? ""} onChange={(e) => updateCfg("message", e.target.value)} />
          <div className="md:col-span-2 text-xs text-muted-foreground">SMS provider not connected — step will log only.</div>
        </div>
      );
    case "create_task":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input placeholder="Task title" value={cfg.title ?? ""} onChange={(e) => updateCfg("title", e.target.value)} />
          <Select value={cfg.priority ?? "normal"} onValueChange={(v) => updateCfg("priority", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["low","normal","high","urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea className="md:col-span-2" rows={2} placeholder="Description" value={cfg.description ?? ""} onChange={(e) => updateCfg("description", e.target.value)} />
        </div>
      );
    case "create_alert":
      return (
        <Input placeholder="Alert message" value={cfg.message ?? ""} onChange={(e) => updateCfg("message", e.target.value)} />
      );
    case "add_tag":
      return <Input placeholder="Tag name" value={cfg.tag ?? ""} onChange={(e) => updateCfg("tag", e.target.value)} />;
    case "assign_to":
      return <Input placeholder="User UUID" value={cfg.user_id ?? ""} onChange={(e) => updateCfg("user_id", e.target.value)} />;
    case "webhook":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input className="md:col-span-2" placeholder="https://example.com/hook" value={cfg.url ?? ""} onChange={(e) => updateCfg("url", e.target.value)} />
          <Select value={cfg.method ?? "POST"} onValueChange={(v) => updateCfg("method", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["POST","PUT","PATCH"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      );
    case "wait":
      return <div className="text-xs text-muted-foreground">Delay only — no action performed.</div>;
  }
  return null;
}
