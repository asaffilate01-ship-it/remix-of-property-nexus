import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workflow, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/automations/")({
  head: () => ({ meta: [{ title: "Automations — Gabley" }] }),
  component: AutomationsIndex,
});

type Tpl = { id: string; name: string; description: string | null; trigger_event: string; entity_type: string; is_active: boolean; created_at: string };

function AutomationsIndex() {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("track_templates").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const toggle = async (id: string, val: boolean) => {
    const { error } = await supabase.from("track_templates").update({ is_active: val }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const createTpl = async () => {
    const name = prompt("Template name?");
    if (!name) return;
    const { data: u } = await supabase.auth.getUser();
    const { data: ag } = await supabase.from("agencies").select("id").eq("owner_id", u.user?.id ?? "").maybeSingle();
    if (!ag) return toast.error("Only agency owners can create templates.");
    const { error } = await supabase.from("track_templates").insert({ name, agency_id: ag.id, trigger_event: "manual" as any, entity_type: "lead" as any, is_active: false, created_by: u.user?.id ?? null });
    if (error) return toast.error(error.message);
    toast.success("Template created"); void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Automations" description="Multi-step workflows that react to events across your CRM." actions={
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/automations/runs">View runs</Link></Button>
          <Button onClick={createTpl}><Plus className="mr-2 h-4 w-4" /> New template</Button>
        </div>
      } />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Workflow className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No automations yet. Create your first template.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((t) => (
            <Card key={t.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/automations/$id" params={{ id: t.id }} className="font-semibold hover:underline truncate">{t.name}</Link>
                  <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "active" : "paused"}</Badge>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline" className="font-normal">on {t.trigger_event.replaceAll("_"," ")}</Badge>
                  <Badge variant="outline" className="font-normal">{t.entity_type}</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => toggle(t.id, !t.is_active)}>{t.is_active ? "Pause" : "Activate"}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
