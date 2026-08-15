import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Check, Clock, CreditCard, Loader2 } from "lucide-react";
import { getWorkspaceAccess } from "@/lib/billing.functions";
import { PLANS } from "@/lib/plans";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const RECOVERY_PATHS = ["/settings", "/agency", "/branches", "/team"];

export function WorkspaceAccessGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const fetchAccess = useServerFn(getWorkspaceAccess);
  const [access, setAccess] = useState<Awaited<ReturnType<typeof fetchAccess>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await fetchAccess({});
      if (currentRequest !== requestId.current) return;
      setAccess(result);
      setLoadError(false);
    } catch {
      if (currentRequest !== requestId.current) return;
      setAccess(null);
      setLoadError(true);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [fetchAccess]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load, path]);

  if (loading) {
    return (
      <div
        className="flex min-h-52 items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> Checking workspace
        access…
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        <AlertTitle>Unable to verify workspace access</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Operational pages remain closed until the subscription status can be checked.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void load();
            }}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const isRecoveryPath = RECOVERY_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  );
  if (access?.isAgencyUser && !access.hasAccess && !isRecoveryPath) {
    const plan = access.planCode ? PLANS[access.planCode] : null;
    return (
      <div className="mx-auto max-w-xl py-10 sm:py-16">
        <Card className="border-0 shadow-elevated">
          <CardContent className="p-7 text-center sm:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <CreditCard aria-hidden="true" className="h-6 w-6" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">Workspace access is paused</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {access.status === "trialing"
                ? "The agency trial has ended. Choose a plan to restore operational access."
                : `The ${plan?.name ?? "agency"} subscription is ${access.status?.replace(/_/g, " ") ?? "not configured"}.`}
            </p>
            {access.isOwner ? (
              <Button asChild className="mt-6">
                <Link to="/settings" search={{ tab: "billing" }}>
                  Review plans and billing{" "}
                  <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <p className="mt-5 text-sm font-medium">
                Ask the agency owner to update the subscription.
              </p>
            )}
            <p className="mt-5 text-xs text-muted-foreground">
              Agency, branch, team and billing settings remain available while access is paused.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trialDays = access?.trialEnd
    ? Math.max(0, Math.ceil((new Date(access.trialEnd).getTime() - Date.now()) / 86_400_000))
    : null;
  const showTrialWarning =
    access?.isAgencyUser && access.status === "trialing" && trialDays != null && trialDays <= 7;

  return (
    <div className="space-y-5">
      {showTrialWarning && (
        <Alert className="border-primary/20 bg-primary/5">
          <Clock aria-hidden="true" className="h-4 w-4" />
          <AlertTitle>
            {trialDays} {trialDays === 1 ? "day" : "days"} left in the agency trial
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Choose a plan before the trial ends to avoid interrupted access.</span>
            {access.isOwner && (
              <Button asChild size="sm" variant="outline">
                <Link to="/settings" search={{ tab: "billing" }}>
                  View billing
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {path === "/dashboard" && access?.isAgencyUser && access.isOwner && access.onboarding && (
        <OnboardingChecklist state={access.onboarding} />
      )}
      {children}
    </div>
  );
}

function OnboardingChecklist({
  state,
}: {
  state: {
    agencyProfile: boolean;
    firstBranch: boolean;
    firstListing: boolean;
    teamMember: boolean;
  };
}) {
  const steps = [
    { complete: state.agencyProfile, label: "Complete agency profile", to: "/agency" },
    { complete: state.firstBranch, label: "Add first branch", to: "/branches" },
    { complete: state.firstListing, label: "Create first listing", to: "/listings" },
    { complete: state.teamMember, label: "Invite a teammate", to: "/team" },
  ];
  const complete = steps.filter((step) => step.complete).length;
  if (complete === steps.length) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-semibold">Finish setting up your agency</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {complete} of {steps.length} launch steps completed
            </p>
          </div>
          <Progress value={(complete / steps.length) * 100} className="sm:mt-2 sm:max-w-48" />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <Link
              key={step.label}
              to={step.to}
              className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:border-primary/40"
            >
              {step.complete ? (
                <Check aria-hidden="true" className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={step.complete ? "text-muted-foreground line-through" : "font-medium"}
              >
                {step.label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
