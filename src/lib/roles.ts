export const APP_ROLES = [
  "admin",
  "agent",
  "landlord",
  "tenant",
  "buyer",
  "conveyancer",
  "contractor",
  "inventory_clerk",
  "utility_provider",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.some((role) => role === value);
}
