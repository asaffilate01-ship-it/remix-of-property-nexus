import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, CreditCard, ExternalLink, KeyRound, Languages, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/hooks/useLocale";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type AppLocale } from "@/lib/locale";
import { listPermissions, updatePermission } from "@/lib/branches.functions";
import {
  createBillingPortalSession,
  createSubscriptionCheckout,
  getBillingOverview,
  syncSubscriptionCheckout,
} from "@/lib/billing.functions";
import { PLAN_CODES, formatPlanPrice, type PlanCode } from "@/lib/plans";

const settingsSearchSchema = z.object({
  tab: z.enum(["profile", "security", "permissions", "billing", "emails"]).optional(),
  plan: z.enum(PLAN_CODES).optional(),
  billing: z.enum(["success", "cancelled"]).optional(),
  session_id: z.string().max(255).optional(),
});

export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: settingsSearchSchema,
  head: () => ({ meta: [{ title: "Settings — Estately" }] }),
  component: SettingsPage,
});

const CAP_LABEL: Record<string, string> = {
  manage_listings: "Manage listings",
  view_financials: "View financials",
  edit_compliance: "Edit compliance",
  invite_users: "Invite users",
  manage_branches: "Manage branches",
  decide_referencing: "Decide referencing",
  send_alerts: "Send alerts",
};

function SettingsPage() {
  const search = useSearch({ from: "/_authenticated/settings" });
  const { locale, setLocale } = useLocale();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      if (data.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", data.user.id)
          .maybeSingle();
        setName(p?.full_name ?? "");
        setPhone(p?.phone ?? "");
      }
    })();
  }, []);

  const saveProfile = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, phone })
      .eq("id", u.user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (newPassword.length < 12) return toast.error("Use at least 12 characters for your password");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (error) return toast.error(error.message);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your profile and agency permissions.</p>
      </div>
      <Tabs defaultValue={search.tab ?? "profile"}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="permissions">Roles & permissions</TabsTrigger>
          <TabsTrigger value="billing">Plan & billing</TabsTrigger>
          <TabsTrigger value="emails">Email outbox</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <div className="space-y-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-6 space-y-4 max-w-lg">
                <div>
                  <Label>Email</Label>
                  <Input value={email} disabled />
                </div>
                <div>
                  <Label>Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <Button onClick={saveProfile}>Save profile</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-6 space-y-4 max-w-lg">
                <div className="flex items-center gap-2 font-semibold">
                  <KeyRound className="h-4 w-4 text-primary" /> Password
                </div>
                <p className="text-xs text-muted-foreground">
                  Set a password after joining by invitation, or replace your current password.
                </p>
                <div>
                  <Label>New password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  onClick={changePassword}
                  disabled={passwordBusy || !newPassword || !confirmPassword}
                >
                  {passwordBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
                  password
                </Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="max-w-lg space-y-4 p-6">
                <div className="flex items-center gap-2 font-semibold">
                  <Languages className="h-4 w-4 text-primary" aria-hidden="true" /> Language and region
                </div>
                <div>
                  <Label htmlFor="workspace-language">Workspace language</Label>
                  <Select value={locale} onValueChange={(value) => setLocale(value as AppLocale)}>
                    <SelectTrigger id="workspace-language" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LOCALES.map((supportedLocale) => (
                        <SelectItem key={supportedLocale} value={supportedLocale}>
                          {LOCALE_LABELS[supportedLocale]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Navigation is available in UK English and Welsh. Untranslated product and legal
                  content safely falls back to UK English while the wider translation programme is
                  completed.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsMatrix />
        </TabsContent>
        <TabsContent value="billing">
          <BillingSettings
            selectedPlan={search.plan}
            billingResult={search.billing}
            sessionId={search.session_id}
          />
        </TabsContent>
        <TabsContent value="emails">
          <EmailOutbox />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SecuritySettings() {
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [verifiedFactors, setVerifiedFactors] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]).then(([assurance, factors]) => {
      if (!active) return;
      setCurrentLevel(assurance.data?.currentLevel ?? null);
      setVerifiedFactors(
        factors.data?.totp.filter((factor) => factor.status === "verified").length ?? 0,
      );
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-6 space-y-5 max-w-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Multi-factor authentication</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Protect sensitive property, customer and payment workflows with a time-based authenticator code.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Authenticator</div>
              <div className="mt-1 font-medium">
                {verifiedFactors > 0 ? `${verifiedFactors} verified factor${verifiedFactors === 1 ? "" : "s"}` : "Not configured"}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Current session</div>
              <div className="mt-1 font-medium">
                {currentLevel === "aal2" ? "MFA verified" : "Password verified"}
              </div>
            </div>
          </div>
        )}
        <Button asChild disabled={loading}>
          <Link to="/security/mfa" search={{ redirect: "/settings?tab=security" }}>
            <KeyRound className="mr-2 h-4 w-4" />
            {verifiedFactors > 0 ? "Verify secure session" : "Set up authenticator"}
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Platform administrators are required to complete this check before admin data is released by database policies.
        </p>
      </CardContent>
    </Card>
  );
}

type OutboxRow = {
  id: string;
  recipient_email: string;
  template_name: string | null;
  subject: string | null;
  status: string;
  created_at: string;
};

function EmailOutbox() {
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("email_outbox")
        .select("id,recipient_email,template_name,subject,status,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data as OutboxRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Transactional emails, signing requests and saved-search digests are processed by the
          delivery worker. Failed deliveries retry automatically and remain visible here for review.
        </p>
        {loading ? (
          <div className="h-20 rounded-lg bg-muted animate-pulse" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No queued emails yet (admins only).</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.subject ?? r.template_name ?? "Notification"}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.recipient_email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <Badge variant={
                    ["sent", "delivered"].includes(r.status)
                      ? "default"
                      : ["failed", "bounced", "complained"].includes(r.status)
                        ? "destructive"
                        : r.status === "suppressed"
                          ? "outline"
                          : "secondary"
                  }>
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function BillingSettings({
  selectedPlan,
  billingResult,
  sessionId,
}: {
  selectedPlan?: PlanCode;
  billingResult?: "success" | "cancelled";
  sessionId?: string;
}) {
  const fetchOverview = useServerFn(getBillingOverview);
  const checkout = useServerFn(createSubscriptionCheckout);
  const portal = useServerFn(createBillingPortalSession);
  const syncCheckout = useServerFn(syncSubscriptionCheckout);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const syncStarted = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await fetchOverview({}));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load billing");
    } finally {
      setLoading(false);
    }
  }, [fetchOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (billingResult === "cancelled")
      toast.info("Checkout cancelled — your current plan is unchanged.");
    if (billingResult !== "success" || !sessionId || syncStarted.current) return;
    syncStarted.current = true;
    void (async () => {
      setBusy("sync");
      const result = await syncCheckout({ data: { sessionId } });
      if ("error" in result) toast.error(result.error);
      else toast.success("Subscription activated.");
      window.history.replaceState({}, "", "/settings?tab=billing");
      await load();
      setBusy(null);
    })();
  }, [billingResult, load, sessionId, syncCheckout]);

  const startCheckout = async (planCode: PlanCode) => {
    setBusy(planCode);
    try {
      const result = await checkout({ data: { planCode } });
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout");
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy("portal");
    try {
      const result = await portal({});
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open billing portal");
      setBusy(null);
    }
  };

  if (loading || busy === "sync") {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading billing status…
        </CardContent>
      </Card>
    );
  }

  if (!overview?.agencyId) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="p-6">
          <div className="font-semibold">Create your agency first</div>
          <p className="text-sm text-muted-foreground mt-1">
            Subscriptions belong to an agency and are billed by active branch.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/agency">Set up agency</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const subscription = overview.subscription;
  const currentPlan = subscription
    ? overview.plans.find((plan) => plan.code === subscription.planCode)
    : null;
  const trialDays = subscription?.trialEnd
    ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Current subscription</h2>
                <Badge
                  variant={subscription?.hasAccess ? "secondary" : "destructive"}
                  className="capitalize"
                >
                  {subscription?.status?.replace(/_/g, " ") ?? "Not configured"}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold">{currentPlan?.name ?? "No plan"}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {overview.branchCount} active billing{" "}
                  {overview.branchCount === 1 ? "branch" : "branches"}
                  {currentPlan ? ` · ${formatPlanPrice(currentPlan)} per branch/month` : ""}
                </p>
                {subscription?.status === "trialing" && trialDays != null && (
                  <p className="text-sm text-primary mt-2">
                    {trialDays} days remaining in your free trial.
                  </p>
                )}
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {subscription.cancelAtPeriodEnd ? "Access ends" : "Next renewal"}:{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
            </div>
            {overview.isOwner && subscription?.hasStripeSubscription && (
              <Button variant="outline" onClick={openPortal} disabled={busy === "portal"}>
                {busy === "portal" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage billing
              </Button>
            )}
          </div>
          {subscription?.entitlements && (
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Live listings</div>
                <div className="font-semibold">{overview.liveListings} total</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Per-branch limit</div>
                <div className="font-semibold">
                  {subscription.entitlements.maxLiveListingsPerBranch ?? "Unlimited"}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Agency team seats</div>
                <div className="font-semibold">
                  {subscription.entitlements.maxTeamSeats ?? "Unlimited"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold text-lg">Choose a plan</h2>
        <p className="text-sm text-muted-foreground">
          Prices are monthly per branch. Your remaining trial is preserved when checkout starts.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {overview.plans.map((plan) => {
          const isCurrent = subscription?.planCode === plan.code;
          const isSelected = selectedPlan === plan.code;
          return (
            <Card
              key={plan.code}
              className={`relative ${plan.popular || isSelected ? "ring-2 ring-primary" : ""}`}
            >
              {plan.popular && <Badge className="absolute -top-3 left-4">Most popular</Badge>}
              <CardContent className="p-5 flex flex-col h-full">
                <div className="font-semibold">{plan.name}</div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{formatPlanPrice(plan)}</span>
                  <span className="text-xs text-muted-foreground"> / branch/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-xs flex-1">
                  {plan.features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="h-3.5 w-3.5 text-success shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={
                    !overview.isOwner ||
                    busy != null ||
                    (isCurrent && subscription?.hasStripeSubscription)
                  }
                  onClick={() => startCheckout(plan.code)}
                >
                  {busy === plan.code && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCurrent && subscription?.hasStripeSubscription
                    ? "Current plan"
                    : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!overview.isOwner && (
        <p className="text-sm text-muted-foreground">
          Only the agency owner can change plans or billing details.
        </p>
      )}
    </div>
  );
}

function PermissionsMatrix() {
  const fetchPerms = useServerFn(listPermissions);
  const update = useServerFn(updatePermission);
  const [roles, setRoles] = useState<readonly string[]>([]);
  const [caps, setCaps] = useState<readonly string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    fetchPerms({})
      .then((r) => {
        setRoles(r.roles);
        setCaps(r.capabilities);
        setMatrix(r.matrix);
        setAgencyId(r.agencyId);
      })
      .finally(() => setLoading(false));
  }, [fetchPerms]);

  const toggle = async (role: string, cap: string, allowed: boolean) => {
    setMatrix((curr) => {
      const next = { ...curr };
      const list = new Set(next[role] ?? []);
      if (allowed) list.add(cap);
      else list.delete(cap);
      next[role] = Array.from(list);
      return next;
    });
    try {
      await update({ data: { role, capability: cap, allowed } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  if (loading)
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  if (!agencyId)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No agency on this account.
        </CardContent>
      </Card>
    );

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-primary" />
          <div>
            <div className="font-semibold">Roles & permissions</div>
            <div className="text-xs text-muted-foreground">
              Only the agency owner can change these. Defaults are applied on first load.
            </div>
          </div>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="text-left py-2 pr-4">Capability</th>
                {roles.map((r) => (
                  <th key={r} className="text-center py-2 px-2 capitalize">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {caps.map((cap) => (
                <tr key={cap} className="border-t">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">{CAP_LABEL[cap] ?? cap}</div>
                    <div className="text-[11px] text-muted-foreground">{cap}</div>
                  </td>
                  {roles.map((role) => {
                    const allowed = matrix[role]?.includes(cap) ?? false;
                    const disabled = role === "owner"; // Owner is always all-powerful
                    return (
                      <td key={role} className="py-2.5 px-2 text-center">
                        <Switch
                          checked={role === "owner" ? true : allowed}
                          disabled={disabled}
                          onCheckedChange={(v) => toggle(role, cap, v)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">Owner: full access</Badge>
          <Badge variant="outline">Changes save automatically</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
