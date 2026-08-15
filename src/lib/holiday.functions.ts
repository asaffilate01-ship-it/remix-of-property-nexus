import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const fetchHolidayData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [properties, bookings, blocks, cleaning] = await Promise.all([
      context.supabase.from("properties").select("id,address,city,postcode,title").order("address"),
      context.supabase.from("holiday_bookings").select("*").order("check_in"),
      context.supabase.from("property_blocks").select("*").order("start_date"),
      context.supabase.from("cleaning_jobs").select("*").order("scheduled_at"),
    ]);
    return {
      properties: properties.data ?? [],
      bookings: bookings.data ?? [],
      blocks: blocks.data ?? [],
      cleaning: cleaning.data ?? [],
    };
  });

const bookingSchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().uuid(),
  guest_name: z.string().min(1).max(200),
  guest_email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  guest_phone: z.string().max(40).optional().nullable(),
  guests_count: z.number().int().min(1).max(50).default(1),
  check_in: z.string().min(10),
  check_out: z.string().min(10),
  nightly_rate: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  cleaning_fee: z.number().nullable().optional(),
  status: z.enum(["enquiry","provisional","confirmed","checked_in","checked_out","cancelled"]).default("confirmed"),
  source: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const saveBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof bookingSchema>) => bookingSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (new Date(data.check_out) <= new Date(data.check_in)) throw new Error("Check-out must be after check-in");
    // Overlap check
    const overlap = await context.supabase
      .from("holiday_bookings")
      .select("id")
      .eq("property_id", data.property_id)
      .neq("status", "cancelled")
      .lt("check_in", data.check_out)
      .gt("check_out", data.check_in)
      .maybeSingle();
    if (overlap.data && overlap.data.id !== data.id) throw new Error("Dates clash with another booking");

    const row: any = { ...data, guest_email: data.guest_email || null };
    delete row.id;
    if (data.id) {
      const { error } = await context.supabase.from("holiday_bookings").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: out, error } = await context.supabase.from("holiday_bookings").insert({ ...row, created_by: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out!.id };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("holiday_bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const blockSchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().uuid(),
  kind: z.enum(["owner","maintenance","other"]),
  start_date: z.string().min(10),
  end_date: z.string().min(10),
  notes: z.string().max(500).optional().nullable(),
});

export const saveBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof blockSchema>) => blockSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row: any = { ...data };
    delete row.id;
    if (data.id) {
      const { error } = await context.supabase.from("property_blocks").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: out, error } = await context.supabase.from("property_blocks").insert({ ...row, created_by: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out!.id };
  });

export const deleteBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("property_blocks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const cleanSchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().uuid(),
  scheduled_at: z.string().min(10),
  duration_minutes: z.number().int().min(15).max(720).default(120),
  status: z.enum(["scheduled","in_progress","done","cancelled"]).default("scheduled"),
  assignee_name: z.string().max(200).optional().nullable(),
  kind: z.string().max(40).default("standard"),
  notes: z.string().max(500).optional().nullable(),
});

export const saveCleaning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof cleanSchema>) => cleanSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row: any = { ...data };
    delete row.id;
    if (data.id) {
      const { error } = await context.supabase.from("cleaning_jobs").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: out, error } = await context.supabase.from("cleaning_jobs").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out!.id };
  });
