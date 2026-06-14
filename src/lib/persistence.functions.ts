import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

// ===== Property types (public lookup) =====
export const fetchPropertyTypes = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("property_types")
      .select("code,label,category,sort_order")
      .eq("active", true)
      .order("sort_order");
    return { types: data ?? [] };
  });

// ===== Tenants =====
export const fetchTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("tenants")
      .select("*, tenancies:tenancies(id,status,property_id,rent_amount,start_date,end_date)")
      .order("full_name");
    return { tenants: data ?? [] };
  });

const tenantSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  dob: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
});

export const saveTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof tenantSchema>) => tenantSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agency_id = await resolveAgencyId(context.supabase, context.userId);
    const row: any = {
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      dob: data.dob || null,
      notes: data.notes || null,
      agency_id,
    };
    if (data.id) {
      const { data: out, error } = await context.supabase.from("tenants").update(row).eq("id", data.id).select("id").single();
      if (error) throw new Error(error.message);
      return { id: out.id };
    }
    const { data: out, error } = await context.supabase.from("tenants").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out.id };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tenants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Buyer profiles =====
const buyerSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  budget_min: z.number().nullable().optional(),
  budget_max: z.number().nullable().optional(),
  areas: z.array(z.string()).default([]),
  property_type_codes: z.array(z.string()).default([]),
  bedrooms_min: z.number().int().nullable().optional(),
  finance_status: z.enum(["cash","mortgage","aip","unknown"]).default("unknown"),
  chain_status: z.enum(["no-chain","in-chain","first-time-buyer","unknown"]).default("unknown"),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().default(true),
});

export const fetchBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("buyer_profiles").select("*").order("created_at", { ascending: false });
    return { buyers: data ?? [] };
  });

export const saveBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof buyerSchema>) => buyerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agency_id = await resolveAgencyId(context.supabase, context.userId);
    if (!agency_id) throw new Error("No agency for current user");
    const row: any = { ...data, agency_id, email: data.email || null };
    delete row.id;
    if (data.id) {
      const { error } = await context.supabase.from("buyer_profiles").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: out, error } = await context.supabase.from("buyer_profiles").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out.id };
  });

export const deleteBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyer_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Seller profiles =====
const sellerSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  property_id: z.string().uuid().nullable().optional(),
  asking_price: z.number().nullable().optional(),
  reason: z.string().max(500).optional().nullable(),
  target_completion: z.string().optional().nullable().or(z.literal("")),
  chain_status: z.enum(["no-chain","in-chain","onward-purchase","unknown"]).default("unknown"),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().default(true),
});

export const fetchSellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sellers, properties] = await Promise.all([
      context.supabase.from("seller_profiles").select("*").order("created_at", { ascending: false }),
      context.supabase.from("properties").select("id, address, city, postcode"),
    ]);
    return { sellers: sellers.data ?? [], properties: properties.data ?? [] };
  });

export const saveSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof sellerSchema>) => sellerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agency_id = await resolveAgencyId(context.supabase, context.userId);
    if (!agency_id) throw new Error("No agency for current user");
    const row: any = {
      ...data,
      agency_id,
      email: data.email || null,
      target_completion: data.target_completion || null,
      property_id: data.property_id || null,
    };
    delete row.id;
    if (data.id) {
      const { error } = await context.supabase.from("seller_profiles").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: out, error } = await context.supabase.from("seller_profiles").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out.id };
  });

export const deleteSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("seller_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Templates =====
export const fetchTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [templates, instances] = await Promise.all([
      context.supabase.from("templates").select("*").eq("active", true).order("category").order("name"),
      context.supabase.from("template_instances").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    return { templates: templates.data ?? [], instances: instances.data ?? [] };
  });

const instanceSchema = z.object({
  template_id: z.string().uuid(),
  property_id: z.string().uuid().nullable().optional(),
  tenancy_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  values: z.record(z.string(), z.any()).default({}),
  recipient_contact_ids: z.array(z.string().uuid()).default([]),
  status: z.enum(["draft","sent","signed","void"]).default("draft"),
});

export const createTemplateInstance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof instanceSchema>) => instanceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agency_id = await resolveAgencyId(context.supabase, context.userId);
    if (!agency_id) throw new Error("No agency for current user");
    const row: any = {
      ...data,
      agency_id,
      created_by: context.userId,
      sent_at: data.status === "sent" ? new Date().toISOString() : null,
    };
    const { data: out, error } = await context.supabase.from("template_instances").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out.id };
  });

export const updateInstanceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), status: z.enum(["draft","sent","signed","void"]) }))
  .handler(async ({ data, context }) => {
    const patch: any = { status: data.status };
    if (data.status === "sent") patch.sent_at = new Date().toISOString();
    if (data.status === "signed") patch.signed_at = new Date().toISOString();
    const { error } = await context.supabase.from("template_instances").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
