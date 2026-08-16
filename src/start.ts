import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { isRequestAbort } from "./lib/request-errors";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // A navigation, reload, closed tab, or cancelled asset request can close the
    // socket while SSR is still running. Complete it here so h3 cannot promote
    // the harmless disconnect to a logged 500 before the server entry sees it.
    if (isRequestAbort(error)) {
      return new Response(null, { status: 499 });
    }
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Promo gate: the marketing homepage stays public, everything else needs the
// shared preview password until the launch period ends.
const promoGateMiddleware = createMiddleware().server(async ({ next, request }) => {
  const accepts = request.headers.get("accept") ?? "";
  if (request.method !== "GET" || !accepts.includes("text/html")) return next();

  const url = new URL(request.url);
  const { isOpenPath, getGateSession } = await import("./lib/gate.server");
  if (isOpenPath(url.pathname)) return next();

  try {
    const session = await getGateSession();
    if (session.data.unlocked) return next();
  } catch {
    // Session cookie unreadable (rotated secret) — fall through to the gate.
  }

  const target = `/unlock?next=${encodeURIComponent(url.pathname + url.search)}`;
  return new Response(null, { status: 302, headers: { location: target } });
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, promoGateMiddleware],
}));
