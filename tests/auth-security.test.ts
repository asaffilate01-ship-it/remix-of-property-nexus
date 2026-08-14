import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isCompleteMfaCode,
  isSelfServiceRole,
  normalizeMfaCode,
  safeMfaQrCode,
  safeMfaRedirect,
} from "../src/lib/auth-security.ts";

describe("authentication hardening", () => {
  test("allows public product roles but never privileged metadata roles", () => {
    assert.equal(isSelfServiceRole("agent"), true);
    assert.equal(isSelfServiceRole("contractor"), true);
    assert.equal(isSelfServiceRole("admin"), false);
    assert.equal(isSelfServiceRole("owner"), false);
  });

  test("normalizes authenticator codes", () => {
    assert.equal(normalizeMfaCode("12 34-567"), "123456");
    assert.equal(isCompleteMfaCode("123456"), true);
    assert.equal(isCompleteMfaCode("12345"), false);
  });

  test("keeps post-MFA navigation local and prevents loops", () => {
    assert.equal(safeMfaRedirect("/reports?range=30d"), "/reports?range=30d");
    assert.equal(safeMfaRedirect("//evil.example"), "/dashboard");
    assert.equal(safeMfaRedirect("/security/mfa?redirect=/security/mfa"), "/dashboard");
  });

  test("accepts only bounded SVG image data for authenticator QR codes", () => {
    assert.equal(
      safeMfaQrCode("data:image/svg+xml;base64,PHN2Zy8+"),
      "data:image/svg+xml;base64,PHN2Zy8+",
    );
    assert.equal(safeMfaQrCode("https://evil.example/qr.svg"), null);
    assert.equal(safeMfaQrCode("data:text/html,<script>alert(1)</script>"), null);
  });
});
