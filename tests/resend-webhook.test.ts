import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Webhook } from "svix";
import {
  hashEmail,
  maskEmail,
  normalizeEmail,
  verifyResendWebhook,
} from "../src/lib/resend-webhook.server.ts";

describe("Resend webhook handling", () => {
  test("verifies a signed event and rejects tampering", () => {
    const secret = "whsec_dGVzdC13ZWJob29rLXNlY3JldA==";
    const body = JSON.stringify({
      type: "email.bounced",
      created_at: "2026-08-14T12:00:00.000Z",
      data: { email_id: "provider-123", to: ["Person@Example.com"] },
    });
    const id = "msg_test_123";
    const date = new Date();
    const signature = new Webhook(secret).sign(id, date, body);
    const headers = new Headers({
      "svix-id": id,
      "svix-timestamp": String(Math.floor(date.getTime() / 1000)),
      "svix-signature": signature,
    });

    assert.equal(verifyResendWebhook(secret, body, headers).event.type, "email.bounced");
    assert.throws(() => verifyResendWebhook(secret, `${body} `, headers));
  });

  test("normalizes, hashes, and masks recipients without storing plaintext", () => {
    assert.equal(normalizeEmail(" Person@Example.COM "), "person@example.com");
    assert.equal(hashEmail("Person@Example.COM"), hashEmail(" person@example.com "));
    assert.equal(maskEmail("Person@Example.COM"), "pe***@example.com");
    assert.equal(hashEmail("person@example.com").length, 64);
  });
});
