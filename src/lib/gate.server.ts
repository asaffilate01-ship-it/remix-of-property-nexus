import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

export function gateSessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "estately-promo-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export function getGateSession() {
  return useSession<GateSession>(gateSessionConfig());
}

export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Paths that stay reachable while the promo gate is locked. */
const OPEN_PREFIXES = [
  "/unlock",
  "/api/",
  "/_serverFn",
  "/_build",
  "/@",
  "/node_modules",
  "/src/",
  "/assets/",
];

const OPEN_EXACT = new Set([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/sw.js",
]);

export function isOpenPath(pathname: string): boolean {
  if (OPEN_EXACT.has(pathname)) return true;
  return OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
