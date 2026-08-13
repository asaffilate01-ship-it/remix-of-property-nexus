import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, describe, test } from "node:test";
import { verifyWebhook } from "../src/lib/stripe.server.ts";

const originalSecret = process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
const secret = "whsec_test_webhook_secret";

afterEach(() => {
  if (originalSecret === undefined) delete process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
  else process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = originalSecret;
});

function signedRequest(body: string, timestamp: string, signature?: string) {
  process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = secret;
  const digest =
    signature ?? createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Request("https://app.example/api/public/payments/webhook?env=sandbox", {
    method: "POST",
    headers: { "stripe-signature": `t=${timestamp},v1=${digest}` },
    body,
  });
}

describe("verifyWebhook", () => {
  test("accepts an authentic, current Stripe event", async () => {
    const body = JSON.stringify({
      id: "evt_test",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test" } },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const event = await verifyWebhook(signedRequest(body, timestamp), "sandbox");
    assert.equal(event.id, "evt_test");
  });

  test("rejects invalid signatures and timestamps", async () => {
    const body = JSON.stringify({ id: "evt_test", type: "test", data: { object: {} } });
    const now = String(Math.floor(Date.now() / 1000));
    await assert.rejects(
      verifyWebhook(signedRequest(body, now, "0".repeat(64)), "sandbox"),
      /signature/,
    );

    const nonNumericTimestamp = "not-a-time";
    await assert.rejects(
      verifyWebhook(signedRequest(body, nonNumericTimestamp), "sandbox"),
      /timestamp/,
    );
  });

  test("rejects replayed and malformed events", async () => {
    const stale = String(Math.floor(Date.now() / 1000) - 601);
    const body = JSON.stringify({ id: "evt_test", type: "test", data: { object: {} } });
    await assert.rejects(verifyWebhook(signedRequest(body, stale), "sandbox"), /too old/);

    const now = String(Math.floor(Date.now() / 1000));
    const malformed = JSON.stringify({ id: "evt_test" });
    await assert.rejects(verifyWebhook(signedRequest(malformed, now), "sandbox"), /event/);
  });
});
