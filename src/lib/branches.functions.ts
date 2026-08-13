import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

async function requireAgencyOwner(supabase: any, agencyId: string, userId: string) {
  const { data } = await supabase
    .from("agencies")
    .select("owner_id")
    .eq("id", agencyId)
    .maybeSingle();
  if (data?.owner_id !== userId) throw new Error("Only the agency owner can manage branches.");
}

export const listBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { branches: [], agencyId: null as string | null, isOwner: false };
    const { data: agency } = await context.supabase
      .from("agencies")
      .select("owner_id")
      .eq("id", agencyId)
      .maybeSingle();
    const { data, error } = await context.supabase
      .from("branches")
      .select("*")
      .eq("agency_id", agencyId)
      .order("is_primary", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return { branches: data ?? [], agencyId, isOwner: agency?.owner_id === context.userId };
  });

const branchSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  is_primary: z.boolean().optional(),
});

export const saveBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => branchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency. Create one in Agency settings first.");
    await requireAgencyOwner(context.supabase, agencyId, context.userId);
    const payload = {
      agency_id: agencyId,
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      postcode: data.postcode || null,
      phone: data.phone || null,
      email: data.email || null,
      is_primary: data.is_primary ?? false,
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("branches")
        .update(payload)
        .eq("id", data.id)
        .eq("agency_id", agencyId);
      if (error) throw new Error(error.message);
      return { id: data.id, billingWarning: null as string | null };
    }
    const { data: ins, error } = await supabaseAdmin
      .from("branches")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { syncStripeBranchQuantity } = await import("./billing.server");
    const billingWarning = await syncStripeBranchQuantity(agencyId);
    return { id: ins.id, billingWarning };
  });

export const deleteBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    await requireAgencyOwner(context.supabase, agencyId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("branches")
      .delete()
      .eq("id", data.id)
      .eq("agency_id", agencyId);
    if (error) throw new Error(error.message);
    const { syncStripeBranchQuantity } = await import("./billing.server");
    const billingWarning = await syncStripeBranchQuantity(agencyId);
    return { ok: true, billingWarning };
  });

// ============== ROLE PERMISSIONS ==============

const DEFAULT_ROLES = ["owner", "manager", "agent", "accounts", "viewer"] as const;
const DEFAULT_CAPABILITIES = [
  "manage_listings",
  "view_financials",
  "edit_compliance",
  "invite_users",
  "manage_branches",
  "decide_referencing",
  "send_alerts",
] as const;

const DEFAULT_MATRIX: Record<string, string[]> = {
  owner: [...DEFAULT_CAPABILITIES],
  manager: ["manage_listings", "view_financials", "edit_compliance", "invite_users", "decide_referencing", "send_alerts"],
  agent: ["manage_listings", "decide_referencing", "send_alerts"],
  accounts: ["view_financials"],
  viewer: [],
};

export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { roles: DEFAULT_ROLES, capabilities: DEFAULT_CAPABILITIES, matrix: DEFAULT_MATRIX, agencyId: null as string | null };
    const { data, error } = await context.supabase
      .from("role_permissions")
      .select("role, capability, allowed")
      .eq("agency_id", agencyId);
    if (error) throw new Error(error.message);
    const matrix: Record<string, string[]> = {};
    for (const role of DEFAULT_ROLES) matrix[role] = [];
    if (!data || data.length === 0) {
      // Seed defaults on first access
      const seeds = DEFAULT_ROLES.flatMap((role) =>
        DEFAULT_CAPABILITIES.map((cap) => ({
          agency_id: agencyId,
          role,
          capability: cap,
          allowed: DEFAULT_MATRIX[role].includes(cap),
        })),
      );
      await context.supabase.from("role_permissions").insert(seeds);
      return { roles: DEFAULT_ROLES, capabilities: DEFAULT_CAPABILITIES, matrix: DEFAULT_MATRIX, agencyId };
    }
    for (const row of data) {
      if (row.allowed && matrix[row.role]) matrix[row.role].push(row.capability);
    }
    return { roles: DEFAULT_ROLES, capabilities: DEFAULT_CAPABILITIES, matrix, agencyId };
  });

export const updatePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      role: z.string().min(1).max(40),
      capability: z.string().min(1).max(60),
      allowed: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("No agency.");
    const { data: owner } = await context.supabase
      .from("agencies").select("owner_id").eq("id", agencyId).maybeSingle();
    if (!owner || owner.owner_id !== context.userId) throw new Error("Only the agency owner can change permissions.");
    const { error } = await context.supabase
      .from("role_permissions")
      .upsert({
        agency_id: agencyId,
        role: data.role,
        capability: data.capability,
        allowed: data.allowed,
      }, { onConflict: "agency_id,role,capability" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
