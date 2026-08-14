import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateProductionEnvironment } from "../src/lib/preflight.ts";

const valid = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_real",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_real",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_real",
  APP_URL: "https://app.estately.co.uk",
  VITE_SITE_URL: "https://app.estately.co.uk",
  CRON_SECRET: "a".repeat(40),
  RESEND_API_KEY: "re_real",
  RESEND_WEBHOOK_SECRET: "whsec_real",
  EMAIL_FROM: "Estately <notifications@estately.co.uk>",
  PUBLIC_RELEASE_SHA: "abc123def456",
  BILLING_STRIPE_ENV: "live",
  PAYMENTS_STRIPE_ENV: "live",
  ENABLE_DEMO_BANK_FEED: "false",
};

describe("production preflight", () => {
  test("passes the core production environment without exposing values", () => {
    assert.deepEqual(validateProductionEnvironment(valid).errors, []);
  });

  test("rejects placeholders, insecure URLs, short cron secrets and demo data", () => {
    const result = validateProductionEnvironment({
      ...valid,
      APP_URL: "http://app.example.com",
      CRON_SECRET: "short",
      RESEND_API_KEY: "replace_me",
      ENABLE_DEMO_BANK_FEED: "true",
    });
    assert.ok(result.errors.some((error) => error.startsWith("APP_URL")));
    assert.ok(result.errors.some((error) => error.startsWith("CRON_SECRET")));
    assert.ok(result.errors.some((error) => error.startsWith("RESEND_API_KEY")));
    assert.ok(result.errors.some((error) => error.startsWith("ENABLE_DEMO_BANK_FEED")));
    assert.equal(result.errors.some((error) => error.includes("short")), false);
  });
});
