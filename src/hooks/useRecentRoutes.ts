import { useEffect, useState, useCallback } from "react";

export type RecentRoute = { to: string; label: string; at: number };

const KEY = "gabley:recent-routes";
const MAX = 6;

function read(): RecentRoute[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RecentRoute[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: RecentRoute[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("gabley:recent-routes:change"));
  } catch {
    /* quota — ignore */
  }
}

const EXCLUDE = ["/auth", "/dashboard", "/", "/marketplace"];

export function trackRoute(to: string, label: string) {
  if (!to || EXCLUDE.includes(to)) return;
  const items = read().filter((i) => i.to !== to);
  items.unshift({ to, label, at: Date.now() });
  write(items.slice(0, MAX));
}

export function useRecentRoutes() {
  const [items, setItems] = useState<RecentRoute[]>(() => read());

  useEffect(() => {
    const onChange = () => setItems(read());
    window.addEventListener("gabley:recent-routes:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("gabley:recent-routes:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const clear = useCallback(() => write([]), []);
  return { items, clear };
}
