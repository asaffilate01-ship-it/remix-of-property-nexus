import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

export const TRIGGER_EVENTS = [
  "manual","lead_created","listing_created","viewing_booked","viewing_completed",
  "offer_received","offer_accepted","tenancy_started","tenancy_ending",
  "contact_created","deal_created",
] as const;

export const ENTITY_TYPES = ["lead","listing","viewing","offer","tenancy","contact","deal"] as const;

export const ACTION_TYPES = ["send_email","create_task","create_alert","send_sms","add_tag","assign_to","webhook","wait"] as const;

export const DELAY_UNITS = ["minutes","hours","days"] as const;

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  trigger_event: z.enum(TRIGGER_EVENTS),
  entity_type: z.enum(ENTITY_TYPES),
  is_active: z.boolean().optional(),
});

const stepSchema = z.object({
  id: z.string().uuid().optional(),
  step_order: z.number().int().min(1).max(100),
  delay_amount: z.number().int().min(0).max(10000),
  delay_unit: z.enum(DELAY_UNITS),
  action_type: z.enum(ACTION_TYPES),
  action_config: z.record(z.string(), z.unknown()).default({}),
});

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { templates: [], agencyId: null as string | null };
    const { data, error } = await context.supabase
      .from("track_templates")
      .select("*, steps:track_steps(count), runs:track_runs(count)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { templates: data ?? [], agencyId };
  });

export const getTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: tpl, error } = await context.supabase
      .from("track_templates").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: steps, error: serr } = await context.supabase
      .from("track_steps").select("*").eq("template_id", data.id).order("step_order");
    if (serr) throw new Error(serr.message);
    return { template: tpl, steps: steps ?? [] };
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => templateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    const payload = {
      agency_id: agencyId,
      name: data.name,
      description: data.description ?? null,
      trigger_event: data.trigger_event,
      entity_type: data.entity_type,
      is_active: data.is_active ?? true,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("track_templates").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("track_templates").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id as string };
  });

export const toggleTemplateActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("track_templates").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("track_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    template_id: z.string().uuid(),
    steps: z.array(stepSchema).max(50),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // Replace all steps for the template (simpler than diffing for v1)
    const { error: delErr } = await context.supabase.from("track_steps").delete().eq("template_id", data.template_id);
    if (delErr) throw new Error(delErr.message);
    if (data.steps.length === 0) return { ok: true };
    const rows = data.steps.map((s, i) => ({
      template_id: data.template_id,
      step_order: i + 1,
      delay_amount: s.delay_amount,
      delay_unit: s.delay_unit,
      action_type: s.action_type,
      action_config: (s.action_config ?? {}) as any,
    }));
    const { error } = await context.supabase.from("track_steps").insert(rows as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { runs: [] };
    let q = context.supabase
      .from("track_runs")
      .select("*, template:track_templates(name, entity_type), run_steps:track_run_steps(status)")
      .eq("agency_id", agencyId)
      .order("started_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: runs, error } = await q;
    if (error) throw new Error(error.message);
    return { runs: runs ?? [] };
  });

export const getRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: run, error } = await context.supabase
      .from("track_runs")
      .select("*, template:track_templates(name, entity_type, trigger_event)")
      .eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: steps, error: serr } = await context.supabase
      .from("track_run_steps")
      .select("*, step:track_steps(action_type, action_config)")
      .eq("run_id", data.id)
      .order("step_order");
    if (serr) throw new Error(serr.message);
    return { run, steps: steps ?? [] };
  });

export const cancelRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("track_runs").update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const enrollEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    template_id: z.string().uuid(),
    entity_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: runId, error } = await context.supabase.rpc("enroll_in_track", {
      _template_id: data.template_id,
      _entity_id: data.entity_id,
      _started_by: context.userId,
      _context: {},
    });
    if (error) throw new Error(error.message);
    return { run_id: runId as string };
  });
