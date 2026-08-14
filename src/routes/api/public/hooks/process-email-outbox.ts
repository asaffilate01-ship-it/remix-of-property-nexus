import { createFileRoute } from "@tanstack/react-router";
import { renderOutboxEmail, type OutboxEmail, validatePublicAppUrl } from "@/lib/email";
import {
  EmailProviderError,
  getEmailProviderConfig,
  sendTransactionalEmail,
} from "@/lib/email.server";
import { authorizeCronRequest } from "@/lib/security.server";
import { hashEmail } from "@/lib/resend-webhook.server";

type ClaimedEmail = OutboxEmail & { attempts: number };

export const Route = createFileRoute("/api/public/hooks/process-email-outbox")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = authorizeCronRequest(request);
        if (unauthorized) return unauthorized;

        let config;
        let appUrl;
        try {
          config = getEmailProviderConfig();
          appUrl = validatePublicAppUrl(process.env.APP_URL?.trim() ?? "").toString();
        } catch (error) {
          console.error("Email worker configuration error", error instanceof Error ? error.message : "unknown");
          return Response.json(
            { ok: false, error: "Email delivery is not configured" },
            { status: 503, headers: { "cache-control": "no-store" } },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const { data, error } = await admin.rpc("claim_email_outbox", { _limit: 25 });
        if (error) {
          console.error("Unable to claim email outbox", error.message);
          return Response.json(
            { ok: false, error: "Email queue is unavailable" },
            { status: 500, headers: { "cache-control": "no-store" } },
          );
        }

        const claimed = (data ?? []) as ClaimedEmail[];
        let sent = 0;
        let retried = 0;
        let failed = 0;
        let suppressed = 0;

        for (const row of claimed) {
          try {
            const { data: suppression, error: suppressionError } = await admin
              .from("email_suppressions")
              .select("email_hash")
              .eq("email_hash", hashEmail(row.recipient_email))
              .eq("active", true)
              .maybeSingle();
            if (suppressionError) throw new Error(`Suppression check failed: ${suppressionError.message}`);
            if (suppression) {
              const { error: updateError } = await admin.from("email_outbox").update({
                status: "suppressed",
                locked_at: null,
                error: "recipient_suppressed",
              }).eq("id", row.id).eq("status", "processing");
              if (updateError) throw new Error(`Queue acknowledgement failed: ${updateError.message}`);
              suppressed += 1;
              continue;
            }

            const rendered = renderOutboxEmail(row, appUrl);
            const providerMessageId = await sendTransactionalEmail(
              config,
              `email-outbox/${row.id}`,
              row.recipient_email,
              rendered,
            );
            const { error: updateError } = await admin.from("email_outbox").update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: providerMessageId,
              locked_at: null,
              error: null,
            }).eq("id", row.id).eq("status", "processing");
            if (updateError) throw new Error(`Queue acknowledgement failed: ${updateError.message}`);
            if (row.template_name === "signature-request") {
              const templateData = row.template_data && typeof row.template_data === "object"
                ? row.template_data as Record<string, unknown>
                : {};
              if (typeof templateData.instance_id === "string") {
                await admin.from("template_instances").update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                }).eq("id", templateData.instance_id).eq("status", "delivery_queued");
              }
            }
            sent += 1;
          } catch (error) {
            const providerError = error instanceof EmailProviderError ? error : null;
            const canRetry = row.attempts < 5 && (providerError?.retryable ?? true);
            const delaySeconds = Math.min(3_600, 60 * 2 ** Math.max(0, row.attempts - 1));
            const safeError = providerError?.status
              ? `provider_http_${providerError.status}`
              : providerError?.message === "Recipient is invalid"
                ? "invalid_recipient"
                : "delivery_failed";

            console.error("Email delivery failed", {
              outboxId: row.id,
              attempt: row.attempts,
              retryable: canRetry,
              error: error instanceof Error ? error.message : "unknown",
            });

            await admin.from("email_outbox").update({
              status: canRetry ? "queued" : "failed",
              locked_at: null,
              error: safeError,
              next_attempt_at: new Date(Date.now() + delaySeconds * 1_000).toISOString(),
            }).eq("id", row.id).eq("status", "processing");
            if (canRetry) retried += 1;
            else failed += 1;
          }
        }

        return Response.json(
          { ok: true, claimed: claimed.length, sent, retried, failed, suppressed },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
