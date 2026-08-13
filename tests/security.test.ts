import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
  authorizeCronRequest,
  normalizeWebhookMethod,
  validateAutomationWebhookUrl,
} from "../src/lib/security.server.ts";

const originalCronSecret = process.env.CRON_SECRET;
const originalAllowedHosts = process.env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS;

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;

  if (originalAllowedHosts === undefined) delete process.env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS;
  else process.env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS = originalAllowedHosts;
});

describe("authorizeCronRequest", () => {
  test("fails closed when CRON_SECRET is missing", () => {
    delete process.env.CRON_SECRET;
    const response = authorizeCronRequest(new Request("https://app.example/api/cron"));
    assert.equal(response?.status, 503);
  });

  test("rejects an invalid secret", () => {
    process.env.CRON_SECRET = "correct-secret";
    const request = new Request("https://app.example/api/cron", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    assert.equal(authorizeCronRequest(request)?.status, 401);
  });

  test("accepts bearer and explicit cron headers", () => {
    process.env.CRON_SECRET = "correct-secret";
    const bearer = new Request("https://app.example/api/cron", {
      headers: { authorization: "Bearer correct-secret" },
    });
    const header = new Request("https://app.example/api/cron", {
      headers: { "x-cron-secret": "correct-secret" },
    });
    assert.equal(authorizeCronRequest(bearer), null);
    assert.equal(authorizeCronRequest(header), null);
  });
});

describe("validateAutomationWebhookUrl", () => {
  test("fails closed without an allowlist", () => {
    delete process.env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS;
    assert.throws(() => validateAutomationWebhookUrl("https://hooks.example.com/run"), /disabled/);
  });

  test("allows exact hosts and explicit wildcard subdomains", () => {
    process.env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS = "hooks.example.com,*.trusted.example";
    assert.equal(
      validateAutomationWebhookUrl("https://hooks.example.com/run").hostname,
      "hooks.example.com",
    );
    assert.equal(
      validateAutomationWebhookUrl("https://tenant.trusted.example/run").hostname,
      "tenant.trusted.example",
    );
  });

  test("rejects unsafe schemes, credentials, ports, and lookalike hosts", () => {
    process.env.AUTOMATION_WEBHOOK_ALLOWED_HOSTS = "hooks.example.com,*.trusted.example";
    assert.throws(() => validateAutomationWebhookUrl("http://hooks.example.com/run"), /HTTPS/);
    assert.throws(
      () => validateAutomationWebhookUrl("https://user:pass@hooks.example.com/run"),
      /credentials/,
    );
    assert.throws(() => validateAutomationWebhookUrl("https://hooks.example.com:8443/run"), /port/);
    assert.throws(
      () => validateAutomationWebhookUrl("https://hooks.example.com.attacker.test/run"),
      /not allowed/,
    );
    assert.throws(() => validateAutomationWebhookUrl("https://trusted.example/run"), /not allowed/);
  });
});

describe("normalizeWebhookMethod", () => {
  test("defaults to POST and restricts methods", () => {
    assert.equal(normalizeWebhookMethod(undefined), "POST");
    assert.equal(normalizeWebhookMethod("patch"), "PATCH");
    assert.throws(() => normalizeWebhookMethod("GET"), /not allowed/);
    assert.throws(() => normalizeWebhookMethod("DELETE"), /not allowed/);
  });
});
