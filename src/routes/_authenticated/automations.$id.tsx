import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/automations/$id")({
  head: () => ({ meta: [{ title: "Automation steps — Gabley" }] }),
  component: AutomationDetail,
});

type Step = {
  id: string;
  step_order: number;
  delay_amount: number;
  delay_unit: string;
  action_type: string;
  action_config: any;
};
type Template = {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  entity_type: string;
  is_active: boolean;
};

const ACTIONS = [
  "send_email",
  "send_sms",
  "create_task",
  "create_alert",
  "add_tag",
  "assign_to",
  "wait",
  "webhook",
];
const UNITS = ["minutes", "hours", "days"];

function AutomationDetail() {
  const { id } = useParams({ from: "/_authenticated/automations/$id" });
  const [tpl, setTpl] = useState<Template | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, s] = await Promise.all([
      supabase.from("track_templates").select("*").eq("id", id).maybeSingle(),
      supabase.from("track_steps").select("*").eq("template_id", id).order("step_order"),
    ]);
    setTpl((t.data as any) ?? null);
    setSteps((s.data as any) ?? []);
    setLoading(false);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const addStep = async () => {
    const next = steps.length ? Math.max(...steps.map((s) => s.step_order)) + 1 : 1;
    const { error } = await supabase
      .from("track_steps")
      .insert({
        template_id: id,
        step_order: next,
        delay_amount: 1,
        delay_unit: "days" as any,
        action_type: "send_email" as any,
        action_config: {},
      });
    if (error) return toast.error(error.message);
    void load();
  };

  const updateStep = async (sid: string, patch: Partial<Step>) => {
    const { error } = await supabase
      .from("track_steps")
      .update(patch as any)
      .eq("id", sid);
    if (error) return toast.error(error.message);
    void load();
  };

  const removeStep = async (sid: string) => {
    if (!confirm("Delete this step?")) return;
    const { error } = await supabase.from("track_steps").delete().eq("id", sid);
    if (error) return toast.error(error.message);
    void load();
  };

  if (loading)
    return (
      <div className="p-8">
        <Card className="animate-pulse">
          <CardContent className="h-32" />
        </Card>
      </div>
    );
  if (!tpl)
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center">Template not found.</CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={tpl.name}
        description={tpl.description ?? "Automation workflow"}
        actions={
          <Button asChild variant="outline">
            <Link to="/automations">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant={tpl.is_active ? "default" : "secondary"}>
          {tpl.is_active ? "Active" : "Paused"}
        </Badge>
        <Badge variant="outline">on {tpl.trigger_event.replaceAll("_", " ")}</Badge>
        <Badge variant="outline">{tpl.entity_type}</Badge>
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <Card key={s.id} className="border-0 shadow-card">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[40px_1fr_1fr_2fr_auto] items-end gap-3">
              <div className="text-xs font-bold text-muted-foreground">#{i + 1}</div>
              <div>
                <Label className="text-xs">Wait</Label>
                <Input
                  type="number"
                  value={s.delay_amount}
                  onChange={(e) => updateStep(s.id, { delay_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select
                  value={s.delay_unit}
                  onValueChange={(val) => updateStep(s.id, { delay_unit: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Action</Label>
                <Select
                  value={s.action_type}
                  onValueChange={(val) => updateStep(s.id, { action_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => removeStep(s.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" className="w-full" onClick={addStep}>
          <Plus className="mr-2 h-4 w-4" /> Add step
        </Button>
      </div>
    </div>
  );
}
