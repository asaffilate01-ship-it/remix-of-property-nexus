import { createHash } from "node:crypto";
import { Webhook } from "svix";
import { z } from "zod";

export const RESEND_EVENT_TYPES = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "email.failed",
  "email.opened",
  "email.clicked",
] as const;

const resendEventSchema = z.object({
  type: z.enum(RESEND_EVENT_TYPES),
  created_at: z.string().datetime({ offset: true }),
  data: z.object({
    email_id: z.string().min(1).max(200),
    to: z.array(z.string().email().max(320)).min(1).max(50),
  }).passthrough(),
}).passthrough();

export type ResendEvent = z.infer<typeof resendEventSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const separator = normalized.lastIndexOf("@");
  if (separator < 1) return "***";
  const local = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

export function verifyResendWebhook(
  secret: string,
  rawBody: string,
  headers: Headers,
): { event: ResendEvent; svixId: string } {
  const svixId = headers.get("svix-id")?.trim() ?? "";
  const timestamp = headers.get("svix-timestamp")?.trim() ?? "";
  const signature = headers.get("svix-signature")?.trim() ?? "";
  if (!svixId || !timestamp || !signature) throw new Error("Webhook signature headers are missing");

  const verified = new Webhook(secret).verify(rawBody, {
    "svix-id": svixId,
    "svix-timestamp": timestamp,
    "svix-signature": signature,
  });
  return { event: resendEventSchema.parse(verified), svixId };
}
