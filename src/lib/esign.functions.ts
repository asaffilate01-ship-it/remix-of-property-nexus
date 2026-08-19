import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Sends an existing contract instance to the agency's connected e-signature
 * provider (Dropbox Sign / DocuSign). Signed events return on
 * /api/public/webhooks/esign. Agencies on the built-in Gabley signer keep
 * using sendForSignature instead.
 */
export const sendViaEsignProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ instance_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inst, error } = await context.supabase
      .from("template_instances")
      .select("id, agency_id, title, status, pdf_storage_path, signers_meta, templates:template_id(name)")
      .eq("id", data.instance_id)
      .single();
    if (error || !inst) throw new Error("Contract not found.");

    const { data: conn } = await context.supabase
      .from("provider_connections")
      .select("provider, enabled, config")
      .eq("agency_id", inst.agency_id)
      .eq("kind", "esign")
      .maybeSingle();

    const provider = (conn?.enabled ? conn.provider : "gabley") as "gabley" | "dropbox_sign" | "docusign";
    if (provider === "gabley") {
      throw new Error("Your agency uses built-in Gabley signing — send the contract from the contract screen.");
    }
    if (!inst.pdf_storage_path) {
      throw new Error("Generate the contract PDF before sending it to an external e-sign provider.");
    }

    const signers = Array.isArray(inst.signers_meta)
      ? (inst.signers_meta as Array<{ role?: string; name?: string; email?: string }>)
          .filter((s) => s?.email && s?.name)
          .map((s) => ({ role: String(s.role ?? "signer"), name: String(s.name), email: String(s.email) }))
      : [];
    if (signers.length === 0) throw new Error("This contract has no signers with email addresses.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(inst.pdf_storage_path, 60 * 30);
    if (signErr || !signed?.signedUrl) throw new Error("Could not create a secure link to the contract PDF.");

    const { sendEnvelope } = await import("@/lib/esign-providers.server");
    const result = await sendEnvelope(provider, {
      instance_id: inst.id,
      title: inst.title || (inst as any).templates?.name || "Contract",
      signers,
      document_url: signed.signedUrl,
      document_name: `${(inst.title || "contract").replace(/[^a-z0-9\-_ ]/gi, "").slice(0, 60) || "contract"}.pdf`,
      test_mode: Boolean((conn?.config as any)?.test_mode ?? true),
    });

    const { error: upErr } = await context.supabase
      .from("template_instances")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        esign_provider: result.provider,
        esign_external_ref: result.external_ref,
      })
      .eq("id", inst.id);
    if (upErr) throw new Error(upErr.message);

    return { provider: result.provider, external_ref: result.external_ref, detail: result.detail };
  });
