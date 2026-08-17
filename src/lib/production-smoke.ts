export type ProductionSmokeOptions = {
  baseUrl: string;
  expectedRelease: string;
  timeoutMs?: number;
};

export type ProductionSmokeResult = {
  checks: string[];
  errors: string[];
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function smokeTarget(options: ProductionSmokeOptions): {
  origin: string;
  expectedRelease: string;
  timeoutMs: number;
} {
  const url = new URL(options.baseUrl);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("SMOKE_BASE_URL must be an HTTPS origin without credentials");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SMOKE_BASE_URL must contain an origin only, without a path, query or hash");
  }
  if (!/^[a-zA-Z0-9._-]{7,64}$/.test(options.expectedRelease)) {
    throw new Error("SMOKE_EXPECTED_RELEASE_SHA must be an immutable release identifier");
  }

  return {
    origin: url.origin,
    expectedRelease: options.expectedRelease,
    timeoutMs: options.timeoutMs ?? 10_000,
  };
}

function checkCommonHeaders(response: Response, label: string, errors: string[]) {
  const required: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-permitted-cross-domain-policies": "none",
    "referrer-policy": "strict-origin-when-cross-origin",
  };

  for (const [name, expected] of Object.entries(required)) {
    if (response.headers.get(name) !== expected) {
      errors.push(`${label} is missing the expected ${name} header`);
    }
  }
  if (!response.headers.get("strict-transport-security")?.includes("max-age=")) {
    errors.push(`${label} is missing HSTS`);
  }
}

function checkHtmlHeaders(response: Response, label: string, errors: string[]) {
  if (!response.headers.get("content-type")?.includes("text/html")) {
    errors.push(`${label} did not return HTML`);
  }
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!cacheControl.includes("private") || !cacheControl.includes("no-store")) {
    errors.push(`${label} is not protected by private, no-store caching`);
  }
  const csp = response.headers.get("content-security-policy") ?? "";
  if (!csp.includes("object-src 'none'") || !csp.includes("frame-ancestors 'none'")) {
    errors.push(`${label} is missing the hardened HTML content-security-policy`);
  }
}

async function boundedText(response: Response, label: string, maxBytes = 5_000_000) {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`${label} response exceeds the smoke-test body limit`);
  }
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new Error(`${label} response exceeds the smoke-test body limit`);
  }
  return body;
}

export async function runProductionSmoke(
  options: ProductionSmokeOptions,
  fetcher: FetchLike = fetch,
): Promise<ProductionSmokeResult> {
  const { origin, expectedRelease, timeoutMs } = smokeTarget(options);
  const checks: string[] = [];
  const errors: string[] = [];

  async function request(path: string, label: string): Promise<Response | null> {
    try {
      const response = await fetcher(`${origin}${path}`, {
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": "Gabley-Production-Smoke/1.0" },
      });
      checkCommonHeaders(response, label, errors);
      return response;
    } catch {
      errors.push(`${label} could not be reached within the smoke-test timeout`);
      return null;
    }
  }

  const health = await request("/api/public/health", "Health endpoint");
  if (health) {
    if (health.status !== 200) errors.push(`Health endpoint returned HTTP ${health.status}`);
    else {
      try {
        const payload = JSON.parse(await boundedText(health, "Health endpoint", 128_000)) as {
          status?: unknown;
          release?: unknown;
        };
        if (payload.status !== "ok") errors.push("Health endpoint did not report an ok status");
        if (payload.release !== expectedRelease) {
          errors.push("Health endpoint release does not match the expected deployed release");
        }
        if (health.headers.get("x-release-sha") !== expectedRelease) {
          errors.push("Health endpoint x-release-sha does not match the expected release");
        }
        if (!health.headers.get("cache-control")?.includes("no-store")) {
          errors.push("Health endpoint is not protected by no-store caching");
        }
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "Health endpoint returned invalid JSON",
        );
      }
    }
    checks.push("release health");
  }

  const home = await request("/", "Home page");
  if (home) {
    if (home.status < 200 || home.status >= 300)
      errors.push(`Home page returned HTTP ${home.status}`);
    checkHtmlHeaders(home, "Home page", errors);
    checks.push("HTML security and cache policy");
  }

  const robots = await request("/robots.txt", "Robots endpoint");
  if (robots) {
    if (robots.status !== 200) errors.push(`Robots endpoint returned HTTP ${robots.status}`);
    else {
      try {
        const body = await boundedText(robots, "Robots endpoint");
        if (!body.includes("User-agent:") || !body.includes(`${origin}/sitemap.xml`)) {
          errors.push("Robots endpoint does not advertise the canonical sitemap");
        }
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "Robots endpoint returned an invalid body",
        );
      }
    }
    checks.push("robots discovery");
  }

  const sitemap = await request("/sitemap.xml", "Sitemap endpoint");
  if (sitemap) {
    if (sitemap.status !== 200) errors.push(`Sitemap endpoint returned HTTP ${sitemap.status}`);
    else {
      try {
        const body = await boundedText(sitemap, "Sitemap endpoint");
        if (!body.includes("<urlset") || !body.includes(`${origin}/`)) {
          errors.push("Sitemap endpoint does not contain canonical application URLs");
        }
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "Sitemap endpoint returned an invalid body",
        );
      }
    }
    checks.push("canonical sitemap");
  }

  const dashboard = await request("/dashboard", "Protected dashboard");
  if (dashboard) {
    if (dashboard.status === 404 || dashboard.status >= 500) {
      errors.push(`Protected dashboard returned HTTP ${dashboard.status}`);
    } else if (dashboard.status >= 300 && dashboard.status < 400) {
      const location = dashboard.headers.get("location");
      let redirectIsLocal = false;
      try {
        redirectIsLocal = Boolean(location && new URL(location, origin).origin === origin);
      } catch {
        redirectIsLocal = false;
      }
      if (!redirectIsLocal) {
        errors.push("Protected dashboard returned an unsafe or missing redirect");
      }
    } else if (dashboard.status >= 200 && dashboard.status < 300) {
      checkHtmlHeaders(dashboard, "Protected dashboard", errors);
    }
    checks.push("protected-route response");
  }

  return { checks, errors: [...new Set(errors)] };
}
