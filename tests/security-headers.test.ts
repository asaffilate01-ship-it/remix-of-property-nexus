import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CONTENT_SECURITY_POLICY, withSecurityHeaders } from "../src/lib/security-headers.ts";

describe("production response security headers", () => {
  test("makes every HTML response private and non-cacheable", async () => {
    const response = withSecurityHeaders(
      new Response("<!doctype html><title>Gabley</title>", {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=3600",
        },
      }),
    );

    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("content-security-policy"), CONTENT_SECURITY_POLICY);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-permitted-cross-domain-policies"), "none");
    assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");
    assert.equal(await response.text(), "<!doctype html><title>Gabley</title>");
  });

  test("preserves API cache policy and does not attach an HTML CSP", () => {
    const response = withSecurityHeaders(
      Response.json({ status: "ok" }, { headers: { "cache-control": "public, max-age=60" } }),
    );

    assert.equal(response.headers.get("cache-control"), "public, max-age=60");
    assert.equal(response.headers.get("content-security-policy"), null);
    assert.equal(response.headers.get("strict-transport-security")?.includes("max-age="), true);
  });
});
