import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTenancyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: tenancies, error } = await supabase
      .from("tenancies")
      .select("id, tenant_name, tenant_email, property_id, room_id, start_date, end_date, rent_amount, rent_frequency, deposit, deposit_scheme, deposit_reference, status, agency_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (tenancies ?? []).map((t) => t.id);
    const propIds = Array.from(new Set((tenancies ?? []).map((t) => t.property_id).filter(Boolean))) as string[];

    const [{ data: props }, { data: schedules }, { data: events }] = await Promise.all([
      propIds.length
        ? supabase.from("properties").select("id, address, city, postcode").in("id", propIds)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from("rent_schedule").select("id, tenancy_id, due_date, amount, paid_amount, status").in("tenancy_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from("tenancy_events").select("tenancy_id, kind, occurred_at").in("tenancy_id", ids).order("occurred_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const propsById = new Map((props ?? []).map((p: any) => [p.id, p]));

    return (tenancies ?? []).map((t) => {
      const tSched = (schedules ?? []).filter((s: any) => s.tenancy_id === t.id);
      const arrears = tSched
        .filter((s: any) => s.status !== "paid" && new Date(s.due_date) <= new Date())
        .reduce((sum: number, s: any) => sum + Number(s.amount) - Number(s.paid_amount ?? 0), 0);
      const tEvents = (events ?? []).filter((e: any) => e.tenancy_id === t.id);
      const lastEvent = tEvents[0];
      const property = propsById.get(t.property_id as string);
      return {
        ...t,
        property_address: property
          ? [property.address, property.city, property.postcode].filter(Boolean).join(", ")
          : null,
        arrears,
        next_due: tSched.find((s: any) => s.status !== "paid")?.due_date ?? null,
        last_event_kind: lastEvent?.kind ?? null,
        last_event_at: lastEvent?.occurred_at ?? null,
      };
    });
  });

export const getTenancyLifecycle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tenancyId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: tenancy, error } = await supabase
      .from("tenancies")
      .select("*")
      .eq("id", data.tenancyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tenancy) throw new Error("Tenancy not found");

    const [{ data: property }, { data: events }, { data: schedule }, { data: offers }, { data: viewings }, { data: compliance }, { data: docs }] = await Promise.all([
      tenancy.property_id
        ? supabase.from("properties").select("id, address, city, postcode").eq("id", tenancy.property_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("tenancy_events").select("*").eq("tenancy_id", tenancy.id).order("occurred_at", { ascending: false }),
      supabase.from("rent_schedule").select("*").eq("tenancy_id", tenancy.id).order("due_date", { ascending: true }),
      supabase.from("offers").select("id, amount, status, buyer_name, submitted_at").eq("tenancy_id", tenancy.id).order("submitted_at", { ascending: false }),
      supabase.from("viewings").select("id, applicant_name, scheduled_at, status, feedback").eq("property_id", tenancy.property_id ?? "00000000-0000-0000-0000-000000000000").order("scheduled_at", { ascending: false }).limit(10),
      supabase.from("compliance_records").select("id, kind, status, due_date").eq("tenancy_id", tenancy.id),
      supabase.from("documents").select("id, name, type, created_at").eq("tenancy_id", tenancy.id).order("created_at", { ascending: false }).limit(20),
    ]);

    return {
      tenancy,
      property: property ?? null,
      events: events ?? [],
      schedule: schedule ?? [],
      offers: offers ?? [],
      viewings: viewings ?? [],
      compliance: compliance ?? [],
      documents: docs ?? [],
    };
  });

export const logTenancyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tenancyId: string; kind: string; summary?: string; payload?: Record<string, unknown> }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("tenancy_events").insert({
      tenancy_id: data.tenancyId,
      actor_user_id: userId,
      kind: data.kind as any,
      summary: data.summary ?? null,
      payload: (data.payload ?? {}) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const advanceTenancyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tenancyId: string; status: "draft" | "active" | "ended" | "renewed" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("tenancies")
      .update({ status: data.status as any })
      .eq("id", data.tenancyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
