import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useConsent } from "@/lib/consent";
import { trackPageView } from "@/lib/analytics";

/**
 * Sends page views only after the visitor granted analytics consent.
 * Withdrawing consent stops tracking immediately (no reload needed).
 */
export function ConsentedAnalytics() {
  const { consent } = useConsent();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!consent?.analytics) return;
    trackPageView(pathname);
  }, [consent?.analytics, pathname]);

  return null;
}
