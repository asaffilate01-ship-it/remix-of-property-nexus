// Server-only outbound adapters for tenant referencing providers.
import type { ReferencingProviderId } from "./providers";

export type ReferencingSubmission = {
  check_type: string;
  case_id: string;
  check_id: string;
  applicant: Record<string, unknown>;
  employment: Record<string, unknown>;
  previous_landlord: Record<string, unknown>;
  income_monthly: number | null;
  credit_consent: boolean;
  callback_url: string;
};

export type ReferencingSubmitResult = {
  external_ref: string;
  status: "in_progress" | "passed" | "failed" | "review";
  raw: Record<string, unknown>;
};

const DEFAULT_ENDPOINTS: Partial<Record<ReferencingProviderId, string>> = {
  goodlord: "https://api.goodlord.co/v1/references",
  homelet: "https://api.homelet.co.uk/v1/references",
  rentprofile: "https://api.rentprofile.co/v1/checks",
  canopy: "https://api.canopy.rent/v1/referencing/checks",
};

export function referencingEndpoint(
  provider: ReferencingProviderId,
  connectionConfig: Record<string, unknown> | null,
): string | null {
  const configured = typeof connectionConfig?.api_url === "string" ? (connectionConfig.api_url as string) : null;
  return configured || process.env.REFERENCING_API_URL || DEFAULT_ENDPOINTS[provider] || null;
}

/**
 * Submits a check to the configured provider. The provider replies with its own
 * reference; the final decision arrives asynchronously on
 * /api/public/referencing-webhook (HMAC signed with REFERENCING_WEBHOOK_SECRET).
 */
export async function submitReferencingCheck(
  provider: ReferencingProviderId,
  connectionConfig: Record<string, unknown> | null,
  submission: ReferencingSubmission,
): Promise<ReferencingSubmitResult> {
  const url = referencingEndpoint(provider, connectionConfig);
  const apiKey = process.env.REFERENCING_API_KEY;

  if (!url) {
    throw new Error(
      `No API endpoint configured for ${provider}. Add it on the provider connection or set REFERENCING_API_URL.`,
    );
  }
  if (!apiKey) {
    throw new Error("REFERENCING_API_KEY is not configured. Add the secret before requesting live checks.");
  }
  if (!process.env.REFERENCING_WEBHOOK_SECRET) {
    throw new Error("REFERENCING_WEBHOOK_SECRET is not configured, so results could not be received securely.");
  }

  const body = {
    reference: submission.check_id,
    case_reference: submission.case_id,
    check_type: submission.check_type,
    consent: submission.credit_consent,
    applicant: submission.applicant,
    employment: submission.employment,
    previous_landlord: submission.previous_landlord,
    income_monthly: submission.income_monthly,
    callback_url: submission.callback_url,
    ...(typeof connectionConfig?.account_ref === "string" ? { account_ref: connectionConfig.account_ref } : {}),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${provider} rejected the request (${res.status}): ${text.slice(0, 300)}`);
  }

  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text.slice(0, 500) };
  }

  const external =
    (typeof json.id === "string" && json.id) ||
    (typeof json.reference === "string" && json.reference) ||
    (typeof json.external_ref === "string" && json.external_ref) ||
    submission.check_id;

  const statusRaw = typeof json.status === "string" ? json.status.toLowerCase() : "in_progress";
  const status: ReferencingSubmitResult["status"] =
    statusRaw === "passed" || statusRaw === "pass" || statusRaw === "approved"
      ? "passed"
      : statusRaw === "failed" || statusRaw === "declined"
        ? "failed"
        : statusRaw === "review" || statusRaw === "referred"
          ? "review"
          : "in_progress";

  return { external_ref: external, status, raw: json };
}
