import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Provider-agnostic referencing/ID/credit-check webhook.
// Configure REFERENCING_WEBHOOK_SECRET to enable signature verification.
// Expected JSON body:
//   { external_ref: string, status: "passed"|"failed"|"review"|"expired",
//     score?: number, result?: object, provider?: string }
// Header: X-Webhook-Signature: hex(hmac_sha256(secret, raw_body))

const Body = z.object({
  external_ref: z.string().min(1).max(256),
  status: z.enum(["passed", "failed", "review", "expired", "in_progress"]),
  score: z.number().int().min(0).max(1000).optional(),
  result: z.record(z.any()).optional(),
  provider: z.string().min(1).max(64).optional(),
});

export const Route = createFileRoute("/api/public/referencing-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const secret = process.env.REFERENCING_WEBHOOK_SECRET;

        if (secret) {
          const sig = request.headers.get("x-webhook-signature") ?? "";
          const expected = createHmac("sha256", secret).update(raw).digest("hex");
          const a = Buffer.from(sig);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let parsed;
        try {
          parsed = Body.parse(JSON.parse(raw));
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const update = {
          status: parsed.status,
          completed_at: ["passed", "failed", "expired"].includes(parsed.status) ? new Date().toISOString() : null,
          ...(parsed.score !== undefined ? { score: parsed.score } : {}),
          ...(parsed.result ? { result: parsed.result } : {}),
          ...(parsed.provider ? { provider: parsed.provider } : {}),
        };

        const { error } = await supabaseAdmin
          .from("referencing_checks")
          .update(update)
          .eq("external_ref", parsed.external_ref);

        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
