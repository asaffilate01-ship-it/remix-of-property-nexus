import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, hasSubscriptionAccess, type PlanCode, type SubscriptionStatus } from "@/lib/plans";

export const TEAM_ROLES = ["manager", "agent", "accounts", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

const tokenSchema = z
  .string()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function hashToken(token: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(token).digest("hex");
}

function getApplicationUrl(): string {
  const configured = process.env.APP_URL;
  if (!configured) throw new Error("APP_URL is not configured");
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("APP_URL must use HTTPS");
  }
  return url.origin;
}

async function resolveAgency(context: {
  supabase: any;
  userId: string;
}): Promise<{ agencyId: string; ownerId: string; isOwner: boolean } | null> {
  const { data: owned } = await context.supabase
    .from("agencies")
    .select("id, owner_id")
    .eq("owner_id", context.userId)
    .limit(1)
    .maybeSingle();
  if (owned) return { agencyId: owned.id, ownerId: owned.owner_id, isOwner: true };

  const { data: membership } = await context.supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", context.userId)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: agency } = await supabaseAdmin
    .from("agencies")
    .select("owner_id")
    .eq("id", membership.agency_id)
    .maybeSingle();
  return {
    agencyId: membership.agency_id,
    ownerId: agency?.owner_id ?? "",
    isOwner: agency?.owner_id === context.userId,
  };
}

function requireOwner(
  agency: Awaited<ReturnType<typeof resolveAgency>>,
): asserts agency is NonNullable<Awaited<ReturnType<typeof resolveAgency>>> {
  if (!agency) throw new Error("No agency is connected to this account");
  if (!agency.isOwner) throw new Error("Only the agency owner can manage the team");
}

export const getTeamOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agency = await resolveAgency(context);
    if (!agency) {
      return {
        agencyId: null as string | null,
        isOwner: false,
        members: [],
        invitations: [],
        occupiedSeats: 0,
        seatLimit: null as number | null,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const [{ data: agencyRow }, { data: memberRows }, { data: subscription }, inviteResult] =
      await Promise.all([
        admin.from("agencies").select("name").eq("id", agency.agencyId).single(),
        admin
          .from("agency_members")
          .select("id, user_id, role, created_at")
          .eq("agency_id", agency.agencyId)
          .order("created_at"),
        admin
          .from("agency_subscriptions")
          .select("plan_code, status, trial_end")
          .eq("agency_id", agency.agencyId)
          .maybeSingle(),
        agency.isOwner
          ? admin
              .from("agency_invitations")
              .select("id, email, role, expires_at, created_at")
              .eq("agency_id", agency.agencyId)
              .is("accepted_at", null)
              .is("revoked_at", null)
              .gt("expires_at", new Date().toISOString())
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

    const rows = memberRows ?? [];
    const profilesResult = rows.length
      ? await admin
          .from("profiles")
          .select("id, full_name")
          .in(
            "id",
            rows.map((row: any) => row.user_id),
          )
      : { data: [] };
    const profileNames = new Map(
      (profilesResult.data ?? []).map((profile: any) => [profile.id, profile.full_name]),
    );
    const members = await Promise.all(
      rows.map(async (row: any) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
        return {
          id: row.id,
          userId: row.user_id,
          name:
            profileNames.get(row.user_id) ?? data.user?.user_metadata?.full_name ?? "Team member",
          email: data.user?.email ?? "Email unavailable",
          role: row.user_id === agency.ownerId ? "owner" : row.role,
          joinedAt: row.created_at,
          isOwner: row.user_id === agency.ownerId,
        };
      }),
    );

    const sub = subscription as {
      plan_code: PlanCode;
      status: SubscriptionStatus;
      trial_end: string | null;
    } | null;
    const seatLimit = sub ? PLANS[sub.plan_code].entitlements.maxTeamSeats : null;
    const invitations = inviteResult.data ?? [];
    return {
      agencyId: agency.agencyId,
      agencyName: agencyRow?.name ?? "Agency",
      isOwner: agency.isOwner,
      members,
      invitations,
      occupiedSeats: members.length + invitations.length,
      seatLimit,
      hasSubscriptionAccess: sub ? hasSubscriptionAccess(sub.status, sub.trial_end) : false,
    };
  });

export const createTeamInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z
      .object({
        email: z.string().email().max(254),
        role: z.enum(TEAM_ROLES),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const agency = await resolveAgency(context);
    requireOwner(agency);
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: memberRows } = await admin
      .from("agency_members")
      .select("user_id")
      .eq("agency_id", agency.agencyId);
    for (const member of memberRows ?? []) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      if (normalizeEmail(userData.user?.email ?? "") === email) {
        return { error: "That email is already a member of this agency" };
      }
    }

    await admin
      .from("agency_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("agency_id", agency.agencyId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .lte("expires_at", new Date().toISOString());

    const { randomBytes } = await import("node:crypto");
    const token = randomBytes(32).toString("base64url");
    const tokenHash = await hashToken(token);
    const { data: invitation, error } = await admin
      .from("agency_invitations")
      .insert({
        agency_id: agency.agencyId,
        email,
        role: data.role,
        token_hash: tokenHash,
        invited_by: context.userId,
      })
      .select("id, expires_at")
      .single();
    if (error?.code === "23505")
      return { error: "A current invitation already exists for that email" };
    if (error || !invitation) return { error: error?.message ?? "Unable to create invitation" };

    const url = new URL("/auth", getApplicationUrl());
    url.searchParams.set("invite", token);
    url.searchParams.set("redirect", "/dashboard");
    return { inviteUrl: url.toString(), expiresAt: invitation.expires_at };
  });

export const getTeamInvitation = createServerFn({ method: "GET" })
  .validator((value: unknown) => z.object({ token: tokenSchema }).parse(value))
  .handler(async ({ data }) => {
    const tokenHash = await hashToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitation } = await (supabaseAdmin as any)
      .from("agency_invitations")
      .select("email, role, expires_at, agencies(name)")
      .eq("token_hash", tokenHash)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!invitation) return { valid: false as const };
    const agency = invitation.agencies as { name?: string } | null;
    return {
      valid: true as const,
      email: invitation.email as string,
      role: invitation.role as TeamRole,
      agencyName: agency?.name ?? "this agency",
      expiresAt: invitation.expires_at as string,
    };
  });

export const acceptTeamInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ token: tokenSchema }).parse(value))
  .handler(async ({ data, context }) => {
    const email = String((context.claims as Record<string, unknown>).email ?? "");
    if (!email) return { error: "Your signed-in account has no email address" };
    const tokenHash = await hashToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agencyId, error } = await (supabaseAdmin as any).rpc("accept_agency_invitation", {
      _token_hash: tokenHash,
      _user_id: context.userId,
      _email: email,
    });
    if (error) return { error: error.message };
    return { agencyId: agencyId as string };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z.object({ memberId: z.string().uuid(), role: z.enum(TEAM_ROLES) }).parse(value),
  )
  .handler(async ({ data, context }) => {
    const agency = await resolveAgency(context);
    requireOwner(agency);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("agency_members")
      .select("user_id")
      .eq("id", data.memberId)
      .eq("agency_id", agency.agencyId)
      .maybeSingle();
    if (!member) return { error: "Team member not found" };
    if (member.user_id === agency.ownerId) return { error: "The owner role cannot be changed" };
    const { error } = await supabaseAdmin
      .from("agency_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("agency_id", agency.agencyId);
    return error ? { error: error.message } : { ok: true as const };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ memberId: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const agency = await resolveAgency(context);
    requireOwner(agency);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("agency_members")
      .select("user_id")
      .eq("id", data.memberId)
      .eq("agency_id", agency.agencyId)
      .maybeSingle();
    if (!member) return { error: "Team member not found" };
    if (member.user_id === agency.ownerId) return { error: "The agency owner cannot be removed" };
    const { error } = await supabaseAdmin
      .from("agency_members")
      .delete()
      .eq("id", data.memberId)
      .eq("agency_id", agency.agencyId);
    return error ? { error: error.message } : { ok: true as const };
  });

export const revokeTeamInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ invitationId: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const agency = await resolveAgency(context);
    requireOwner(agency);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("agency_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.invitationId)
      .eq("agency_id", agency.agencyId)
      .is("accepted_at", null)
      .is("revoked_at", null);
    return error ? { error: error.message } : { ok: true as const };
  });
