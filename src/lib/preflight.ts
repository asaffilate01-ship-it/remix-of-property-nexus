type Environment = Record<string, string | undefined>;

export type PreflightResult = { errors: string[]; warnings: string[] };

const REQUIRED = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_URL",
  "VITE_SITE_URL",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "EMAIL_FROM",
  "PUBLIC_RELEASE_SHA",
] as const;

function isPlaceholder(value: string): boolean {
  return /replace[_-]?me|your-project|your-publishable|example\.com|at-least-32|provider-api-key/i.test(value);
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateProductionEnvironment(env: Environment): PreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED) {
    const value = env[key]?.trim() ?? "";
    if (!value) errors.push(`${key} is missing`);
    else if (isPlaceholder(value)) errors.push(`${key} still contains a placeholder`);
  }

  if (env.APP_URL && !isHttpsUrl(env.APP_URL)) errors.push("APP_URL must be an HTTPS URL");
  if (env.SUPABASE_URL && !isHttpsUrl(env.SUPABASE_URL)) errors.push("SUPABASE_URL must be an HTTPS URL");
  if (env.VITE_SUPABASE_URL && !isHttpsUrl(env.VITE_SUPABASE_URL)) errors.push("VITE_SUPABASE_URL must be an HTTPS URL");
  if (env.SUPABASE_URL && env.VITE_SUPABASE_URL && env.SUPABASE_URL !== env.VITE_SUPABASE_URL) {
    errors.push("SUPABASE_URL and VITE_SUPABASE_URL point to different projects");
  }
  if ((env.CRON_SECRET?.trim().length ?? 0) < 32) errors.push("CRON_SECRET must be at least 32 characters");
  if (env.RESEND_API_KEY && !env.RESEND_API_KEY.startsWith("re_")) errors.push("RESEND_API_KEY has an unexpected format");
  if (env.RESEND_WEBHOOK_SECRET && !env.RESEND_WEBHOOK_SECRET.startsWith("whsec_")) {
    errors.push("RESEND_WEBHOOK_SECRET has an unexpected format");
  }
  if (env.VITE_SITE_URL && !isHttpsUrl(env.VITE_SITE_URL)) errors.push("VITE_SITE_URL must be an HTTPS URL");
  if (env.APP_URL && env.VITE_SITE_URL && env.APP_URL.replace(/\/$/, "") !== env.VITE_SITE_URL.replace(/\/$/, "")) {
    errors.push("APP_URL and VITE_SITE_URL must use the same canonical origin");
  }
  if (env.PUBLIC_RELEASE_SHA && !/^[a-zA-Z0-9._-]{7,64}$/.test(env.PUBLIC_RELEASE_SHA)) {
    errors.push("PUBLIC_RELEASE_SHA must be an immutable release identifier");
  }
  if (env.EMAIL_FROM && !/^[^\r\n]*<[^\s@]+@[^\s@]+\.[^\s@]+>$|^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EMAIL_FROM.trim())) {
    errors.push("EMAIL_FROM is not a valid sender address");
  }
  if (env.ENABLE_DEMO_BANK_FEED === "true") errors.push("ENABLE_DEMO_BANK_FEED must be false in production");

  const billingEnvironment = env.BILLING_STRIPE_ENV?.trim();
  const paymentsEnvironment = env.PAYMENTS_STRIPE_ENV?.trim();
  if (billingEnvironment !== "live" || paymentsEnvironment !== "live") {
    warnings.push("Stripe is not fully configured for live mode");
  }
  if (!env.VALUATION_PROVIDER_URL || !env.VALUATION_PROVIDER_API_KEY) {
    warnings.push("AVM is disabled until both valuation provider variables are configured");
  }
  if (!env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS) {
    warnings.push("Outbound automation webhooks are disabled because no allowlist is configured");
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
