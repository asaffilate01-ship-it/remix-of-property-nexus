import { useEffect, useState } from "react";

export const CONSENT_KEY = "gabley.cookie-consent.v2";
const LEGACY_KEY = "gabley.cookie-consent.v1";
export const CONSENT_EVENT = "gabley:consent-change";

export type ConsentCategory = "necessary" | "preferences" | "analytics" | "marketing";

export type ConsentState = {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  at: string;
  version: 2;
};

export const ACCEPT_ALL: Omit<ConsentState, "at" | "version"> = {
  necessary: true,
  preferences: true,
  analytics: true,
  marketing: true,
};

export const ESSENTIAL_ONLY: Omit<ConsentState, "at" | "version"> = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function readConsent(): ConsentState | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ConsentState;
      if (parsed && typeof parsed === "object") return { ...parsed, necessary: true };
    }
    // Migrate the older all/essential choice.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { choice?: string; at?: string };
      const base = parsed.choice === "all" ? ACCEPT_ALL : ESSENTIAL_ONLY;
      const migrated: ConsentState = {
        ...base,
        necessary: true,
        at: parsed.at ?? new Date().toISOString(),
        version: 2,
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch {
    /* privacy mode / SSR */
  }
  return null;
}

export function writeConsent(choice: Omit<ConsentState, "at" | "version">): ConsentState {
  const next: ConsentState = { ...choice, necessary: true, at: new Date().toISOString(), version: 2 };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  } catch {
    /* privacy mode */
  }
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: next }));
  }
  return next;
}

export function clearConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* privacy mode */
  }
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const c = readConsent();
  return Boolean(c?.[category]);
}

/** Reactive consent state. `null` means the visitor has not chosen yet. */
export function useConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const onChange = (e: Event) => setConsent((e as CustomEvent<ConsentState | null>).detail ?? null);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) setConsent(readConsent());
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { consent, ready };
}
