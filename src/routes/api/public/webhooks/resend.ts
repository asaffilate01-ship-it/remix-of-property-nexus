import { createFileRoute } from "@tanstack/react-router";
import {
  hashEmail,
  maskEmail,
  verifyResendWebhook,
} from "@/lib/resend-webhook.server";

const MAX_BODY_BYTES = 256 * 1024;
const NO_STORE = { "cache-control": "no-store" };

export const Route = createFileRoute("/api/public/webhooks/resend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
        if (!secret) {
          console.error("Resend webhook is not configured");
          return Response.json({ ok: false }, { status: 503, headers: NO_STORE });
        }

        const declaredLength = Number(request.headers.get("content-length") ?? 0);
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
          return Response.json({ ok: false }, { status: 413, headers: NO_STORE });
        }

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
          return Response.json({ ok: false }, { status: 413, headers: NO_STORE });
        }

        let verified;
        try {
          verified = verifyResendWebhook(secret, rawBody, request.headers);
        } catch {
          return Response.json({ ok: false }, { status: 400, headers: NO_STORE });
        }

        const recipient = verified.event.data.to[0];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await (supabaseAdmin as any).rpc("record_email_delivery_event", {
          _svix_id: verified.svixId,
          _event_type: verified.event.type,
          _provider_message_id: verified.event.data.email_id,
          _recipient_hash: hashEmail(recipient),
          _masked_email: maskEmail(recipient),
          _event_created_at: verified.event.created_at,
        });

        if (error) {
          console.error("Unable to record Resend webhook", { eventType: verified.event.type });
          return Response.json({ ok: false }, { status: 500, headers: NO_STORE });
        }
        return Response.json({ ok: true }, { headers: NO_STORE });
      },
    },
  },
});
