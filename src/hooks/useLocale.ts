import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "@/lib/locale";

const STORAGE_KEY = "estately:locale";
const CHANGE_EVENT = "estately:locale-change";

function preferredLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isAppLocale(saved)) return saved;
  } catch {
    // Storage may be blocked by the browser; the navigator preference still works.
  }
  return window.navigator.language.toLowerCase().startsWith("cy") ? "cy-GB" : DEFAULT_LOCALE;
}

function applyDocumentLocale(locale: AppLocale) {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function useLocale() {
  const [locale, setLocaleState] = useState<AppLocale>(() => preferredLocale());

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const sync = () => setLocaleState(preferredLocale());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the in-memory preference for this session when storage is unavailable.
    }
    setLocaleState(next);
    applyDocumentLocale(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { locale, setLocale };
}
