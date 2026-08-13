export const PLAN_CODES = ["starter", "growth", "unlimited"] as const;

export type PlanCode = (typeof PLAN_CODES)[number];
export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type PlanEntitlements = {
  maxLiveListingsPerBranch: number | null;
  maxTeamSeats: number | null;
  hmo: boolean;
  sales: boolean;
  reports: boolean;
  api: boolean;
  whiteLabel: boolean;
};

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  monthlyPricePence: number;
  description: string;
  popular?: boolean;
  features: string[];
  entitlements: PlanEntitlements;
};

export const PLANS: Record<PlanCode, PlanDefinition> = {
  starter: {
    code: "starter",
    name: "Starter",
    monthlyPricePence: 2_999,
    description: "For independent agencies building their first digital workflow.",
    features: [
      "Up to 3 live listings per branch",
      "Up to 3 team seats",
      "All current operational modules",
      "Public marketplace publishing",
      "Compliance hub and document vault",
      "Tenant and landlord portals",
      "Email support",
    ],
    entitlements: {
      maxLiveListingsPerBranch: 3,
      maxTeamSeats: 3,
      hmo: true,
      sales: true,
      reports: true,
      api: false,
      whiteLabel: false,
    },
  },
  growth: {
    code: "growth",
    name: "Growth",
    monthlyPricePence: 4_999,
    description: "For growing teams managing lettings, HMO and sales together.",
    popular: true,
    features: [
      "Up to 10 live listings per branch",
      "Up to 10 team seats",
      "Everything in Starter",
      "Owner statements",
      "Branch performance reports",
      "Priority support",
    ],
    entitlements: {
      maxLiveListingsPerBranch: 10,
      maxTeamSeats: 10,
      hmo: true,
      sales: true,
      reports: true,
      api: false,
      whiteLabel: false,
    },
  },
  unlimited: {
    code: "unlimited",
    name: "Unlimited",
    monthlyPricePence: 9_999,
    description: "For established agencies that need unlimited operational capacity.",
    features: [
      "Unlimited live listings",
      "Unlimited users",
      "Everything in Growth",
      "All current operational modules",
      "Priority onboarding",
      "Dedicated account support",
    ],
    entitlements: {
      maxLiveListingsPerBranch: null,
      maxTeamSeats: null,
      hmo: true,
      sales: true,
      reports: true,
      api: false,
      whiteLabel: false,
    },
  },
};

export const PAID_ACCESS_STATUSES: SubscriptionStatus[] = ["trialing", "active", "past_due"];

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === "string" && PLAN_CODES.includes(value as PlanCode);
}

export function hasSubscriptionAccess(
  status: SubscriptionStatus | null | undefined,
  trialEnd?: string | null,
): boolean {
  if (!status || !PAID_ACCESS_STATUSES.includes(status)) return false;
  if (status !== "trialing") return true;
  return Boolean(trialEnd && new Date(trialEnd).getTime() > Date.now());
}

export function getEntitlements(
  planCode: PlanCode | null | undefined,
  status: SubscriptionStatus | null | undefined,
  trialEnd?: string | null,
): PlanEntitlements | null {
  if (!planCode || !hasSubscriptionAccess(status, trialEnd)) return null;
  return PLANS[planCode].entitlements;
}

export function formatPlanPrice(plan: PlanDefinition): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(plan.monthlyPricePence / 100);
}
