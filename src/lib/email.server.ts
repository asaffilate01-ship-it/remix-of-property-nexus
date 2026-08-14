import type { RenderedEmail } from "./email";

export class EmailProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "EmailProviderError";
  }
}

export type EmailProviderConfig = {
  apiKey: string;
  from: string;
  replyTo?: string;
};

function validAddressHeader(value: string): boolean {
  if (!value || value.length > 320 || /[\r\n]/.test(value)) return false;
  const address = value.match(/<([^>]+)>/)?.[1] ?? value;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim());
}

export function getEmailProviderConfig(): EmailProviderConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  if (!apiKey || !from) throw new Error("Email provider is not configured");
  if (!apiKey.startsWith("re_")) throw new Error("Email provider key is invalid");
  if (!validAddressHeader(from) || (replyTo && !validAddressHeader(replyTo))) {
    throw new Error("Email sender configuration is invalid");
  }
  return { apiKey, from, replyTo };
}

export async function sendTransactionalEmail(
  config: EmailProviderConfig,
  idempotencyKey: string,
  recipient: string,
  email: RenderedEmail,
): Promise<string> {
  if (!validAddressHeader(recipient)) throw new EmailProviderError("Recipient is invalid", false);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: config.from,
        to: [recipient],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      }),
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new EmailProviderError("Email provider request failed", true);
  }

  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
    throw new EmailProviderError(`Email provider returned HTTP ${response.status}`, retryable, response.status);
  }

  const payload = await response.json().catch(() => null) as { id?: unknown } | null;
  if (!payload || typeof payload.id !== "string" || !payload.id) {
    throw new EmailProviderError("Email provider returned an invalid response", true);
  }
  return payload.id;
}
