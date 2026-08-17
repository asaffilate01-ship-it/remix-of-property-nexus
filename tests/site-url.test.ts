import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSiteUrl, siteUrl } from "../src/lib/site-url.ts";

test("normalizes an HTTPS production URL", () => {
  assert.equal(normalizeSiteUrl(" https://www.gabley.co.uk/ "), "https://www.gabley.co.uk");
});

test("rejects insecure, credentialed, and malformed canonical URLs", () => {
  assert.equal(normalizeSiteUrl("http://gabley.co.uk"), "https://gabley.co.uk");
  assert.equal(normalizeSiteUrl("https://user:pass@gabley.co.uk"), "https://gabley.co.uk");
  assert.equal(normalizeSiteUrl("not-a-url"), "https://gabley.co.uk");
});

test("keeps canonical paths on the configured origin", () => {
  assert.equal(siteUrl("//evil.example/path"), "https://gabley.co.uk/evil.example/path");
});
