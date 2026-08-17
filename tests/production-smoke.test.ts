import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { runProductionSmoke } from "../src/lib/production-smoke.ts";

const release = "abc123def456";
const origin = "https://app.gabley.co.uk";
const commonHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-permitted-cross-domain-policies": "none",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};
const htmlHeaders = {
  ...commonHeaders,
  "content-type": "text/html; charset=utf-8",
  "cache-control": "private, no-store",
  "content-security-policy": "default-src 'self'; object-src 'none'; frame-ancestors 'none'",
};

function passingFetch(input: string | URL | Request): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const responses: Record<string, Response> = {
    "/api/public/health": Response.json(
      { status: "ok", service: "gabley-web", release },
      {
        headers: {
          ...commonHeaders,
          "cache-control": "no-store",
          "x-release-sha": release,
        },
      },
    ),
    "/": new Response("<!doctype html><title>Gabley</title>", { headers: htmlHeaders }),
    "/robots.txt": new Response(`User-agent: *\nSitemap: ${origin}/sitemap.xml`, {
      headers: commonHeaders,
    }),
    "/sitemap.xml": new Response(
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>`,
      { headers: commonHeaders },
    ),
    "/dashboard": new Response(null, {
      status: 302,
      headers: { ...commonHeaders, location: "/auth?next=%2Fdashboard" },
    }),
  };
  return Promise.resolve(responses[url.pathname] ?? new Response("not found", { status: 404 }));
}

describe("production deployment smoke test", () => {
  test("accepts a healthy immutable deployment", async () => {
    const result = await runProductionSmoke(
      { baseUrl: origin, expectedRelease: release },
      passingFetch,
    );

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.checks, [
      "release health",
      "HTML security and cache policy",
      "robots discovery",
      "canonical sitemap",
      "protected-route response",
    ]);
  });

  test("detects release drift, cache leakage and unsafe redirects", async () => {
    const brokenFetch = async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === "/api/public/health") {
        return Response.json(
          { status: "ok", release: "different123" },
          {
            headers: {
              ...commonHeaders,
              "cache-control": "public, max-age=60",
              "x-release-sha": "different123",
            },
          },
        );
      }
      if (url.pathname === "/") {
        return new Response("<!doctype html>", {
          headers: { ...htmlHeaders, "cache-control": "public, max-age=3600" },
        });
      }
      if (url.pathname === "/dashboard") {
        return new Response(null, {
          status: 302,
          headers: { ...commonHeaders, location: "https://attacker.example/login" },
        });
      }
      return passingFetch(input);
    };

    const result = await runProductionSmoke(
      { baseUrl: origin, expectedRelease: release },
      brokenFetch,
    );

    assert.ok(result.errors.some((error) => error.includes("release does not match")));
    assert.ok(result.errors.some((error) => error.includes("not protected by no-store")));
    assert.ok(result.errors.some((error) => error.includes("private, no-store")));
    assert.ok(result.errors.some((error) => error.includes("unsafe or missing redirect")));
  });

  test("rejects insecure or non-origin targets before fetching", async () => {
    await assert.rejects(
      runProductionSmoke(
        { baseUrl: "http://app.gabley.co.uk/path", expectedRelease: release },
        passingFetch,
      ),
      /HTTPS origin/,
    );
  });
});
