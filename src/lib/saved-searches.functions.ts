import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const criteriaSchema = z.record(z.string(), z.unknown());

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_searches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const saveSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().max(120).optional().nullable(),
      criteria: criteriaSchema.default({}),
      polygon: z.unknown().optional().nullable(),
      alert_email: z.boolean().optional(),
      alert_push: z.boolean().optional(),
      frequency: z.enum(["instant", "daily", "weekly"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ins, error } = await context.supabase
      .from("saved_searches")
      .insert({
        user_id: context.userId,
        name: data.name ?? null,
        criteria: data.criteria ?? {},
        polygon: (data.polygon as object | null) ?? null,
        alert_email: data.alert_email ?? true,
        alert_push: data.alert_push ?? false,
        frequency: data.frequency ?? "daily",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const updateSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      alert_email: z.boolean().optional(),
      alert_push: z.boolean().optional(),
      frequency: z.enum(["instant", "daily", "weekly"]).optional(),
      name: z.string().max(120).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.alert_email !== undefined) patch.alert_email = data.alert_email;
    if (data.alert_push !== undefined) patch.alert_push = data.alert_push;
    if (data.frequency !== undefined) patch.frequency = data.frequency;
    if (data.name !== undefined) patch.name = data.name;
    const { error } = await context.supabase
      .from("saved_searches")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_searches")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
