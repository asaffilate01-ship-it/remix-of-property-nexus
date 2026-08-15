import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { PRIVACY_REQUEST_TYPES } from "@/lib/privacy";

const requestSchema = z.object({
  requestType: z.enum(PRIVACY_REQUEST_TYPES),
  details: z.string().trim().max(2000).optional(),
});

const updateSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["submitted", "identity_verification", "in_progress", "completed", "refused"]),
    responseSummary: z.string().trim().max(4000).optional(),
  })
  .superRefine((value, context) => {
    if (["completed", "refused"].includes(value.status) && !value.responseSummary) {
      context.addIssue({
        code: "custom",
        path: ["responseSummary"],
        message: "A response summary is required when closing a request.",
      });
    }
  });

async function requirePlatformAdmin(supabase: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await supabase
    .rpc("current_platform_admin_security_status")
    .maybeSingle();

  if (error || !data?.is_admin_role || !data.is_authorized || !data.is_aal2) {
    throw new Error("Platform administrator MFA verification is required.");
  }
}

export const listMyPrivacyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("privacy_requests")
      .select("id,request_type,status,details,response_summary,submitted_at,due_at,completed_at")
      .eq("user_id", context.userId)
      .order("submitted_at", { ascending: false });

    if (error) throw new Error("Unable to load privacy requests.");
    return { requests: data ?? [] };
  });

export const createPrivacyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.infer<typeof requestSchema>) => requestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: request, error } = await context.supabase
      .from("privacy_requests")
      .insert({
        user_id: context.userId,
        request_type: data.requestType,
        details: data.details || null,
      })
      .select("id,status,due_at")
      .single();

    if (error?.code === "23505") {
      throw new Error("You already have an active request of this type.");
    }
    if (error || !request) throw new Error("Unable to submit the privacy request.");
    return request;
  });

export const withdrawPrivacyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: withdrawn, error } = await context.supabase.rpc("withdraw_privacy_request", {
      _request_id: data.id,
    });

    if (error || !withdrawn) throw new Error("This request can no longer be withdrawn.");
    return { ok: true };
  });

export const listPrivacyRequestsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.supabase);

    const { data: requests, error } = await context.supabase
      .from("privacy_requests")
      .select(
        "id,user_id,request_type,status,details,response_summary,submitted_at,due_at,identity_verified_at,completed_at",
      )
      .order("due_at", { ascending: true })
      .limit(200);

    if (error) throw new Error("Unable to load the privacy operations queue.");
    const userIds = [...new Set((requests ?? []).map((request) => request.user_id))];
    const profiles = userIds.length
      ? await context.supabase.from("profiles").select("id,full_name").in("id", userIds)
      : { data: [], error: null };
    if (profiles.error) throw new Error("Unable to load privacy request identities.");
    const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.full_name]));

    return {
      requests: (requests ?? []).map((request) => ({
        ...request,
        requester_name: names.get(request.user_id) ?? "Verified account",
      })),
    };
  });

export const updatePrivacyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.infer<typeof updateSchema>) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase);
    const patch = {
      status: data.status,
      response_summary: data.responseSummary || null,
    };
    const { error } = await context.supabase
      .from("privacy_requests")
      .update(patch)
      .eq("id", data.id);

    if (error) throw new Error("Unable to update the privacy request.");
    return { ok: true, status: data.status };
  });
