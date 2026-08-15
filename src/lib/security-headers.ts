export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://js.stripe.com",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://js.stripe.com https://www.google.com https://maps.google.com",
  "upgrade-insecure-requests",
].join("; ");

export function withSecurityHeaders(response: Response): Response {
  const contentType = response.headers.get("content-type") ?? "";
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self), payment=(self), interest-cohort=()",
  );
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  if (contentType.includes("text/html")) {
    // Prevent browsers and shared proxies from retaining authenticated SSR output.
    // Public discovery pages remain crawlable; they are simply revalidated per request.
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
