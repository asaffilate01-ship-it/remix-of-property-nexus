import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSiteUrl, siteUrl } from "../src/lib/site-url.ts";

test("normalizes an HTTPS production URL", () => {
  assert.equal(normalizeSiteUrl(" https://www.estately.co.uk/ "), "https://www.estately.co.uk");
});

test("rejects insecure, credentialed, and malformed canonical URLs", () => {
  assert.equal(normalizeSiteUrl("http://estately.app"), "https://estate-elevate-hq.lovable.app");
  assert.equal(normalizeSiteUrl("https://user:pass@estately.app"), "https://estate-elevate-hq.lovable.app");
  assert.equal(normalizeSiteUrl("not-a-url"), "https://estate-elevate-hq.lovable.app");
});

test("keeps canonical paths on the configured origin", () => {
  assert.equal(siteUrl("//evil.example/path"), "https://estate-elevate-hq.lovable.app/evil.example/path");
});
