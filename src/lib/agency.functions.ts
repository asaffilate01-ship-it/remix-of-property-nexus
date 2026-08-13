/* eslint-disable @typescript-eslint/no-explicit-any -- shared agency resolver receives the authenticated Supabase client */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeExternalUrl } from "@/lib/url-safety";

const optionalUrl = z
  .union([
    z.string().max(500).refine((value) => safeExternalUrl(value) !== null, "Use a valid HTTP(S) URL"),
    z.literal(""),
  ])
  .optional()
  .nullable();
const agencySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2_000).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z
    .union([z.string().trim().email().max(254), z.literal("")])
    .optional()
    .nullable(),
  website: optionalUrl,
  logo_url: optionalUrl,
  city: z.string().trim().max(120).optional().nullable(),
});

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "agency"
  );
}

async function resolveAgencyId(supabase: any, userId: string) {
  const { data: owned } = await supabase
    .from("agencies")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (owned?.id) return { agencyId: owned.id as string, isOwner: true };
  const { data: membership } = await supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return membership?.agency_id
    ? { agencyId: membership.agency_id as string, isOwner: false }
    : null;
}

export const getAgencyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await resolveAgencyId(context.supabase, context.userId);
    if (!access) return { agency: null, isOwner: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("agencies")
      .select("id, name, slug, description, phone, email, website, logo_url, city")
      .eq("id", access.agencyId)
      .single();
    if (error) throw new Error(error.message);
    return { agency: data, isOwner: access.isOwner };
  });

export const saveAgencyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => agencySchema.parse(value))
  .handler(async ({ data, context }) => {
    const access = await resolveAgencyId(context.supabase, context.userId);
    if (access && !access.isOwner) throw new Error("Only the agency owner can edit this profile");
    const payload = {
      name: data.name,
      description: data.description || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      logo_url: data.logo_url || null,
      city: data.city || null,
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (access) {
      const { error } = await supabaseAdmin
        .from("agencies")
        .update(payload)
        .eq("id", access.agencyId)
        .eq("owner_id", context.userId);
      if (error) throw new Error(error.message);
      return { agencyId: access.agencyId, created: false };
    }
    const slug = `${slugify(data.name)}-${context.userId.replace(/-/g, "").slice(0, 8)}`;
    const { data: created, error } = await supabaseAdmin
      .from("agencies")
      .insert({ ...payload, slug, owner_id: context.userId })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Unable to create agency");
    return { agencyId: created.id, created: true };
  });
