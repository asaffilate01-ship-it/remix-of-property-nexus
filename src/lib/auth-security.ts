import { safeLocalRedirect } from "./url-safety.ts";

export const SELF_SERVICE_ROLES = [
  "landlord",
  "agent",
  "tenant",
  "buyer",
  "conveyancer",
  "contractor",
  "inventory_clerk",
  "utility_provider",
] as const;

export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

export function isSelfServiceRole(value: unknown): value is SelfServiceRole {
  return typeof value === "string" && SELF_SERVICE_ROLES.includes(value as SelfServiceRole);
}

export function normalizeMfaCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isCompleteMfaCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function safeMfaRedirect(value: string | null | undefined): string {
  const redirect = safeLocalRedirect(value, "/dashboard");
  return redirect.startsWith("/security/mfa") ? "/dashboard" : redirect;
}

export function safeMfaQrCode(value: string | null | undefined): string | null {
  if (!value || value.length > 200_000) return null;
  return /^data:image\/svg\+xml(?:;charset=utf-8|;utf8)?(?:;base64)?,/i.test(value) ? value : null;
}
