import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const fetchHmoData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [properties, rooms, tenancies, rent] = await Promise.all([
      supabase.from("properties").select("id, title, address, city, is_hmo, hmo_licence_number, hmo_licence_expires"),
      supabase.from("rooms").select("*"),
      supabase.from("tenancies").select("*").order("start_date", { ascending: false }),
      supabase.from("rent_schedule").select("*").order("due_date", { ascending: false }).limit(500),
    ]);
    return {
      properties: properties.data ?? [],
      rooms: rooms.data ?? [],
      tenancies: tenancies.data ?? [],
      rent: rent.data ?? [],
    };
  });

export const saveRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: {
    id?: string;
    property_id: string;
    name: string;
    rent_pcm?: number | null;
    deposit?: number | null;
    size_sqm?: number | null;
    en_suite?: boolean;
    bills_included?: boolean;
    available_from?: string | null;
    status?: string;
    description?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const payload = {
      property_id: data.property_id,
      name: data.name,
      rent_pcm: data.rent_pcm ?? null,
      deposit: data.deposit ?? null,
      size_sqm: data.size_sqm ?? null,
      en_suite: data.en_suite ?? false,
      bills_included: data.bills_included ?? true,
      available_from: data.available_from ?? null,
      status: data.status ?? "available",
      description: data.description ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("rooms").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("rooms").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveTenancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: {
    id?: string;
    agency_id?: string | null;
    property_id: string;
    room_id?: string | null;
    tenant_name: string;
    tenant_email?: string | null;
    tenant_phone?: string | null;
    start_date: string;
    end_date?: string | null;
    rent_amount: number;
    rent_frequency: "weekly" | "monthly";
    deposit?: number | null;
    deposit_scheme?: string | null;
    deposit_reference?: string | null;
    status?: "draft" | "active" | "notice" | "ended";
    notes?: string | null;
    generate_schedule?: boolean;
    months?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const payload = {
      agency_id: data.agency_id ?? null,
      property_id: data.property_id,
      room_id: data.room_id ?? null,
      tenant_name: data.tenant_name,
      tenant_email: data.tenant_email ?? null,
      tenant_phone: data.tenant_phone ?? null,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      rent_amount: data.rent_amount,
      rent_frequency: data.rent_frequency,
      deposit: data.deposit ?? 0,
      deposit_scheme: data.deposit_scheme ?? null,
      deposit_reference: data.deposit_reference ?? null,
      status: data.status ?? "active",
      notes: data.notes ?? null,
    };
    let tenancyId = data.id;
    if (data.id) {
      const { error } = await context.supabase.from("tenancies").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await context.supabase.from("tenancies").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      tenancyId = ins.id;
    }

    if (data.generate_schedule && tenancyId) {
      const months = Math.max(1, Math.min(36, data.months ?? 12));
      const start = new Date(data.start_date);
      const rows = [] as Array<{ tenancy_id: string; period_start: string; period_end: string; due_date: string; amount: number; status: "due" }>;
      for (let i = 0; i < months; i++) {
        const periodStart = new Date(start);
        periodStart.setMonth(start.getMonth() + i);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
        rows.push({
          tenancy_id: tenancyId,
          period_start: periodStart.toISOString().slice(0, 10),
          period_end: periodEnd.toISOString().slice(0, 10),
          due_date: periodStart.toISOString().slice(0, 10),
          amount: data.rent_amount,
          status: "due",
        });
      }
      const { error } = await context.supabase.from("rent_schedule").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true, id: tenancyId };
  });

export const markRentPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid(), paid_amount: z.number() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("rent_schedule")
      .update({ status: "paid", paid_amount: data.paid_amount, paid_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
