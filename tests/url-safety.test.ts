import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { safeExternalUrl, safeLocalRedirect } from "../src/lib/url-safety.ts";

describe("safeExternalUrl", () => {
  test("allows ordinary HTTP(S) links", () => {
    assert.equal(safeExternalUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
    assert.equal(safeExternalUrl("http://localhost:3000/file"), "http://localhost:3000/file");
  });

  test("rejects executable schemes, credentials, relative and malformed URLs", () => {
    assert.equal(safeExternalUrl("javascript:alert(1)"), null);
    assert.equal(safeExternalUrl("data:text/html,<script>alert(1)</script>"), null);
    assert.equal(safeExternalUrl("https://user:pass@example.com/file"), null);
    assert.equal(safeExternalUrl("/relative"), null);
    assert.equal(safeExternalUrl("not a url"), null);
  });
});

describe("safeLocalRedirect", () => {
  test("allows root-relative routes with query strings", () => {
    assert.equal(safeLocalRedirect("/marketplace?type=rent"), "/marketplace?type=rent");
  });

  test("rejects protocol-relative, external and control-character destinations", () => {
    assert.equal(safeLocalRedirect("//evil.example/login"), "/dashboard");
    assert.equal(safeLocalRedirect("https://evil.example"), "/dashboard");
    assert.equal(safeLocalRedirect("/ok\nLocation: https://evil.example"), "/dashboard");
    assert.equal(safeLocalRedirect("/\\evil.example"), "/dashboard");
  });
});
