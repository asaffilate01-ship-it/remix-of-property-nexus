import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// E-signature provider callbacks (Dropbox Sign / DocuSign).
// Requires ESIGN_WEBHOOK_SECRET; every request must carry an HMAC-SHA256 hex
// signature of the raw body in X-Webhook-Signature.
export const Route = createFileRoute("/api/public/webhooks/esign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (Number.isFinite(declared) && declared > 512_000) {
          return new Response("Payload too large", { status: 413 });
        }
        const raw = await request.text();
        if (Buffer.byteLength(raw, "utf8") > 512_000) return new Response("Payload too large", { status: 413 });

        const secret = process.env.ESIGN_WEBHOOK_SECRET;
        if (!secret) {
          console.error("ESIGN_WEBHOOK_SECRET is not configured; refusing webhook");
          return new Response("Webhook is not configured", { status: 503 });
        }
        const sig = request.headers.get("x-webhook-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest();
        const supplied = /^[a-f0-9]{64}$/i.test(sig) ? Buffer.from(sig, "hex") : Buffer.alloc(0);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        // Normalise Dropbox Sign and DocuSign shapes to { external_ref, event }.
        const externalRef: string | undefined =
          payload?.signature_request?.signature_request_id ??
          payload?.data?.envelopeId ??
          payload?.envelopeId ??
          payload?.external_ref;
        const eventRaw: string = String(
          payload?.event?.event_type ?? payload?.event ?? payload?.status ?? "",
        ).toLowerCase();
        if (!externalRef) return new Response("Missing envelope reference", { status: 400 });

        const status =
          eventRaw.includes("all_signed") || eventRaw === "completed"
            ? "signed"
            : eventRaw.includes("declined") || eventRaw.includes("voided") || eventRaw.includes("cancel")
              ? "void"
              : eventRaw.includes("signed") || eventRaw.includes("delivered") || eventRaw.includes("sent")
                ? "sent"
                : null;
        if (!status) return Response.json({ ok: true, ignored: eventRaw });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("template_instances")
          .update({
            status,
            ...(status === "signed" ? { signed_at: new Date().toISOString() } : {}),
          })
          .eq("esign_external_ref", externalRef);
        if (error) return new Response(error.message, { status: 500 });

        return Response.json({ ok: true });
      },
    },
  },
});
