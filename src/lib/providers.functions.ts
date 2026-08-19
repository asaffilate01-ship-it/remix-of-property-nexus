import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ESIGN_PROVIDERS, REFERENCING_PROVIDERS } from "@/lib/providers";

async function resolveAgencyId(supabase: any, userId: string): Promise<string | null> {
  const owned = await supabase.from("agencies").select("id").eq("owner_id", userId).limit(1).maybeSingle();
  if (owned.data?.id) return owned.data.id;
  const mem = await supabase.from("agency_members").select("agency_id").eq("user_id", userId).limit(1).maybeSingle();
  return mem.data?.agency_id ?? null;
}

export const listProviderConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) return { agency_id: null, connections: [], secrets: {} as Record<string, boolean> };
    const { data, error } = await context.supabase
      .from("provider_connections")
      .select("*")
      .eq("agency_id", agencyId);
    if (error) throw new Error(error.message);

    // Report only whether a secret is present — never its value.
    const secrets: Record<string, boolean> = {
      REFERENCING_API_KEY: Boolean(process.env.REFERENCING_API_KEY),
      REFERENCING_WEBHOOK_SECRET: Boolean(process.env.REFERENCING_WEBHOOK_SECRET),
      DROPBOX_SIGN_API_KEY: Boolean(process.env.DROPBOX_SIGN_API_KEY),
      DOCUSIGN_ACCESS_TOKEN: Boolean(process.env.DOCUSIGN_ACCESS_TOKEN),
      DOCUSIGN_ACCOUNT_ID: Boolean(process.env.DOCUSIGN_ACCOUNT_ID),
      ESIGN_WEBHOOK_SECRET: Boolean(process.env.ESIGN_WEBHOOK_SECRET),
      ZOOPLA_API_KEY: Boolean(process.env.ZOOPLA_API_KEY),
      RIGHTMOVE_API_KEY: Boolean(process.env.RIGHTMOVE_API_KEY),
    };
    return { agency_id: agencyId, connections: data ?? [], secrets };
  });

export const upsertProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        kind: z.enum(["referencing", "esign"]),
        provider: z.string().min(1).max(64),
        enabled: z.boolean().default(true),
        api_url: z.string().url().max(500).nullable().optional(),
        account_ref: z.string().max(200).nullable().optional(),
        test_mode: z.boolean().default(true),
      })
      .superRefine((v, ctx) => {
        const allowed = v.kind === "referencing" ? REFERENCING_PROVIDERS : ESIGN_PROVIDERS;
        if (!(allowed as readonly string[]).includes(v.provider)) {
          ctx.addIssue({ code: "custom", message: "Unknown provider for this integration type." });
        }
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const agencyId = await resolveAgencyId(context.supabase, context.userId);
    if (!agencyId) throw new Error("You need an agency before connecting providers.");
    const { data: row, error } = await context.supabase
      .from("provider_connections")
      .upsert(
        {
          agency_id: agencyId,
          kind: data.kind,
          provider: data.provider,
          enabled: data.enabled,
          config: {
            ...(data.api_url ? { api_url: data.api_url } : {}),
            ...(data.account_ref ? { account_ref: data.account_ref } : {}),
            test_mode: data.test_mode,
          },
        },
        { onConflict: "agency_id,kind" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { connection: row };
  });
