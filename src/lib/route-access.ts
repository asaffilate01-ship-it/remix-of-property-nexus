import type { AppRole } from "@/lib/roles";

/**
 * Every route rendered inside the authenticated layout. Keep this list explicit:
 * an unclassified new route must fail closed until its audience is reviewed.
 */
export const AUTHENTICATED_ROUTE_BASES = [
  "/agency",
  "/ai-copy",
  "/alerts",
  "/arrears",
  "/automations",
  "/banking",
  "/branches",
  "/buyers",
  "/commercial",
  "/compliance",
  "/contacts",
  "/contractor-marketplace",
  "/dashboard",
  "/deposits",
  "/documents",
  "/e-sign",
  "/evidence",
  "/hmo",
  "/holiday-lets",
  "/inbox",
  "/inspections",
  "/leads",
  "/leasehold",
  "/listing",
  "/listings",
  "/media",
  "/mobile-inspection",
  "/move",
  "/offers",
  "/pipeline",
  "/portal/landlord",
  "/portal/tenant",
  "/portals",
  "/properties",
  "/referencing-cases",
  "/renewals",
  "/reports",
  "/right-to-rent",
  "/sales",
  "/sellers",
  "/settings",
  "/statements",
  "/survey",
  "/team",
  "/templates",
  "/tenancies",
  "/tenants",
  "/vendor-portal",
  "/viewings",
  "/work-orders",
] as const;

type AuthenticatedRouteBase = (typeof AUTHENTICATED_ROUTE_BASES)[number];

const AGENT_DENIED = new Set<AuthenticatedRouteBase>(["/portal/landlord", "/portal/tenant"]);

const LANDLORD_ROUTES = new Set<AuthenticatedRouteBase>([
  "/arrears",
  "/banking",
  "/compliance",
  "/contacts",
  "/contractor-marketplace",
  "/dashboard",
  "/deposits",
  "/documents",
  "/e-sign",
  "/evidence",
  "/hmo",
  "/inbox",
  "/inspections",
  "/leads",
  "/listing",
  "/listings",
  "/properties",
  "/portal/landlord",
  "/referencing-cases",
  "/renewals",
  "/right-to-rent",
  "/settings",
  "/statements",
  "/survey",
  "/tenancies",
  "/tenants",
  "/work-orders",
]);

const TENANT_ROUTES = new Set<AuthenticatedRouteBase>([
  "/compliance",
  "/dashboard",
  "/deposits",
  "/documents",
  "/e-sign",
  "/evidence",
  "/inbox",
  "/inspections",
  "/portal/tenant",
  "/right-to-rent",
  "/settings",
  "/statements",
  "/survey",
  "/work-orders",
]);

const BUYER_ROUTES = new Set<AuthenticatedRouteBase>([
  "/dashboard",
  "/documents",
  "/e-sign",
  "/inbox",
  "/leads",
  "/settings",
  "/vendor-portal",
]);

const CONVEYANCER_ROUTES = new Set<AuthenticatedRouteBase>([
  "/dashboard",
  "/documents",
  "/e-sign",
  "/inbox",
  "/sales",
  "/settings",
]);

const CONTRACTOR_ROUTES = new Set<AuthenticatedRouteBase>([
  "/contractor-marketplace",
  "/dashboard",
  "/evidence",
  "/inbox",
  "/settings",
  "/survey",
  "/work-orders",
]);

const SIMPLE_ROUTES = new Set<AuthenticatedRouteBase>([
  "/dashboard",
  "/evidence",
  "/inbox",
  "/settings",
  "/survey",
  "/work-orders",
]);

const ROLE_ROUTES: Record<
  Exclude<AppRole, "admin" | "agent">,
  ReadonlySet<AuthenticatedRouteBase>
> = {
  landlord: LANDLORD_ROUTES,
  tenant: TENANT_ROUTES,
  buyer: BUYER_ROUTES,
  conveyancer: CONVEYANCER_ROUTES,
  contractor: CONTRACTOR_ROUTES,
  inventory_clerk: SIMPLE_ROUTES,
  utility_provider: SIMPLE_ROUTES,
};

function cleanPath(path: string): string {
  const withoutSearch = path.split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = withoutSearch.startsWith("/") ? withoutSearch : `/${withoutSearch}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
}

export function authenticatedRouteBase(path: string): AuthenticatedRouteBase | null {
  const clean = cleanPath(path);
  // Longest first prevents /portal from ever shadowing a more specific route.
  return (
    [...AUTHENTICATED_ROUTE_BASES]
      .sort((left, right) => right.length - left.length)
      .find((base) => clean === base || clean.startsWith(`${base}/`)) ?? null
  );
}

export function homePathForRole(
  role: AppRole,
): "/dashboard" | "/portal/landlord" | "/portal/tenant" {
  if (role === "landlord") return "/portal/landlord";
  if (role === "tenant") return "/portal/tenant";
  return "/dashboard";
}

export function roleCanAccessPath(role: AppRole, path: string): boolean {
  const base = authenticatedRouteBase(path);
  if (!base) return false;
  if (role === "admin") return true;
  if (role === "agent") return !AGENT_DENIED.has(base);
  return ROLE_ROUTES[role].has(base);
}
