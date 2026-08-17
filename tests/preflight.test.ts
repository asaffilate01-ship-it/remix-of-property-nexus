import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import { validateProductionEnvironment } from "../src/lib/preflight.ts";

const valid = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_real",
  VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY: "AIza-browser-real",
  VITE_PAYMENTS_CLIENT_TOKEN: "pk_live_real",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_real",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_real",
  APP_URL: "https://app.gabley.co.uk",
  VITE_SITE_URL: "https://app.gabley.co.uk",
  CRON_SECRET: "a".repeat(40),
  REFERENCING_WEBHOOK_SECRET: "b".repeat(40),
  RESEND_API_KEY: "re_real",
  RESEND_WEBHOOK_SECRET: "whsec_real",
  EMAIL_FROM: "Gabley <notifications@gabley.co.uk>",
  PUBLIC_RELEASE_SHA: "abc123def456",
  BILLING_STRIPE_ENV: "live",
  PAYMENTS_STRIPE_ENV: "live",
  STRIPE_LIVE_API_KEY: "stripe_connection_live_real",
  LOVABLE_API_KEY: "lovable_real",
  PAYMENTS_LIVE_WEBHOOK_SECRET: "whsec_stripe_real",
  BILLING_STARTER_PRICE_ID_LIVE: "price_starter_real",
  BILLING_GROWTH_PRICE_ID_LIVE: "price_growth_real",
  BILLING_UNLIMITED_PRICE_ID_LIVE: "price_unlimited_real",
  GOOGLE_MAPS_API_KEY: "google_connection_real",
  ENABLE_DEMO_BANK_FEED: "false",
  ENABLE_SIMULATED_REFERENCING: "false",
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
    assert.equal(
      result.errors.some((error) => error.includes("short")),
      false,
    );
  });

  test("blocks sandbox payments and incomplete live provider wiring", () => {
    const result = validateProductionEnvironment({
      ...valid,
      BILLING_STRIPE_ENV: "sandbox",
      PAYMENTS_STRIPE_ENV: "sandbox",
      VITE_PAYMENTS_CLIENT_TOKEN: "pk_test_real",
      PAYMENTS_LIVE_WEBHOOK_SECRET: "not-a-webhook-secret",
      BILLING_GROWTH_PRICE_ID_LIVE: "product_not_a_price",
    });

    assert.ok(result.errors.some((error) => error.startsWith("BILLING_STRIPE_ENV")));
    assert.ok(result.errors.some((error) => error.startsWith("PAYMENTS_STRIPE_ENV")));
    assert.ok(result.errors.some((error) => error.startsWith("VITE_PAYMENTS_CLIENT_TOKEN")));
    assert.ok(result.errors.some((error) => error.startsWith("PAYMENTS_LIVE_WEBHOOK_SECRET")));
    assert.ok(result.errors.some((error) => error.startsWith("BILLING_GROWTH_PRICE_ID_LIVE")));
  });

  test("rejects public/service key reuse and generic replacement placeholders", () => {
    const result = validateProductionEnvironment({
      ...valid,
      SUPABASE_SERVICE_ROLE_KEY: valid.VITE_SUPABASE_PUBLISHABLE_KEY,
      STRIPE_LIVE_API_KEY: "replace-with-live-connection-key",
    });

    assert.ok(result.errors.some((error) => error.startsWith("SUPABASE_SERVICE_ROLE_KEY")));
    assert.ok(result.errors.some((error) => error.startsWith("STRIPE_LIVE_API_KEY")));
  });

  test("documents every required release variable in the environment template", () => {
    const template = readFileSync(resolve(import.meta.dirname, "../.env.example"), "utf8");
    const values = Object.fromEntries(
      template
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    );
    const result = validateProductionEnvironment(values);

    assert.equal(
      result.errors.some((error) => error.endsWith("is missing")),
      false,
    );
  });
});
