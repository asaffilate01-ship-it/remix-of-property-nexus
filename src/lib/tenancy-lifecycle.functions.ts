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
  .validator((input: { tenancyId: string }) => input)
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
      supabase.from("compliance_records").select("id, type, status, expires_on").eq("tenancy_id", tenancy.id),
      supabase.from("documents").select("id, name, scope, created_at").eq("tenancy_id", tenancy.id).order("created_at", { ascending: false }).limit(20),
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
  .validator((input: { tenancyId: string; kind: string; summary?: string; payload?: Record<string, unknown> }) => input)
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
  .validator((input: { tenancyId: string; status: "draft" | "active" | "ended" | "renewed" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("tenancies")
      .update({ status: data.status as any })
      .eq("id", data.tenancyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bookViewing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {
    tenancyId: string;
    applicantName: string;
    applicantEmail?: string;
    applicantPhone?: string;
    scheduledAt: string;
    durationMinutes?: number;
    notes?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: t, error: tErr } = await supabase
      .from("tenancies")
      .select("id, property_id, agency_id")
      .eq("id", data.tenancyId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!t) throw new Error("Tenancy not found");

    const { error } = await supabase.from("viewings").insert({
      owner_id: userId,
      agency_id: t.agency_id,
      property_id: t.property_id,
      applicant_name: data.applicantName,
      applicant_email: data.applicantEmail ?? null,
      applicant_phone: data.applicantPhone ?? null,
      scheduled_at: data.scheduledAt,
      duration_minutes: data.durationMinutes ?? 30,
      notes: data.notes ?? null,
      status: "pending" as any,
    });
    if (error) throw new Error(error.message);

    await supabase.from("tenancy_events").insert({
      tenancy_id: data.tenancyId,
      actor_user_id: userId,
      kind: "viewing_booked" as any,
      summary: `Viewing booked for ${data.applicantName} on ${new Date(data.scheduledAt).toLocaleString("en-GB")}`,
      payload: {} as any,
    });
    return { ok: true };
  });

export const logOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {
    tenancyId: string;
    buyerName: string;
    buyerEmail?: string;
    buyerPhone?: string;
    amount: number;
    notes?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: t, error: tErr } = await supabase
      .from("tenancies")
      .select("id, property_id, agency_id")
      .eq("id", data.tenancyId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!t) throw new Error("Tenancy not found");

    const { error } = await supabase.from("offers").insert({
      owner_id: userId,
      agency_id: t.agency_id,
      property_id: t.property_id,
      tenancy_id: data.tenancyId,
      buyer_name: data.buyerName,
      buyer_email: data.buyerEmail ?? null,
      buyer_phone: data.buyerPhone ?? null,
      amount: data.amount,
      notes: data.notes ?? null,
      status: "pending" as any,
    });
    if (error) throw new Error(error.message);

    await supabase.from("tenancy_events").insert({
      tenancy_id: data.tenancyId,
      actor_user_id: userId,
      kind: "offer_made" as any,
      summary: `Offer of £${data.amount.toLocaleString()} from ${data.buyerName}`,
      payload: { amount: data.amount } as any,
    });
    return { ok: true };
  });

export const generateRentSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { tenancyId: string; months: number; replace?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: t, error: tErr } = await supabase
      .from("tenancies")
      .select("id, start_date, rent_amount, rent_frequency")
      .eq("id", data.tenancyId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!t) throw new Error("Tenancy not found");
    if (!t.start_date) throw new Error("Tenancy is missing a start date");

    if (data.replace) {
      await supabase.from("rent_schedule").delete().eq("tenancy_id", data.tenancyId);
    }

    const freq = (t.rent_frequency ?? "monthly") as string;
    const stepMonths = freq === "weekly" ? 0 : freq === "quarterly" ? 3 : freq === "annually" ? 12 : 1;
    const stepDays = freq === "weekly" ? 7 : 0;

    const rows: any[] = [];
    const start = new Date(t.start_date as string);
    for (let i = 0; i < data.months; i++) {
      const periodStart = new Date(start);
      if (stepDays) periodStart.setDate(start.getDate() + i * stepDays);
      else periodStart.setMonth(start.getMonth() + i * stepMonths);
      const periodEnd = new Date(periodStart);
      if (stepDays) periodEnd.setDate(periodStart.getDate() + stepDays - 1);
      else { periodEnd.setMonth(periodStart.getMonth() + stepMonths); periodEnd.setDate(periodEnd.getDate() - 1); }
      rows.push({
        tenancy_id: data.tenancyId,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        due_date: periodStart.toISOString().slice(0, 10),
        amount: t.rent_amount,
        status: "due" as any,
      });
    }
    const { error } = await supabase.from("rent_schedule").insert(rows);
    if (error) throw new Error(error.message);

    await supabase.from("tenancy_events").insert({
      tenancy_id: data.tenancyId,
      actor_user_id: userId,
      kind: "rent_schedule_generated" as any,
      summary: `Generated ${rows.length} ${freq} rent periods`,
      payload: { count: rows.length } as any,
    });
    return { ok: true, count: rows.length };
  });
