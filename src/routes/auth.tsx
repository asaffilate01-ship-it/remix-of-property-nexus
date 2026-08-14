import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Building2, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { acceptTeamInvitation, getTeamInvitation } from "@/lib/team.functions";
import { safeLocalRedirect } from "@/lib/url-safety";
import { isSelfServiceRole, type SelfServiceRole } from "@/lib/auth-security";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
  invite: z
    .string()
    .min(32)
    .max(256)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
});

function getRedirectTarget(redirect?: string) {
  return safeLocalRedirect(redirect);
}

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Estately" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect, invite } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const inspectInvite = useServerFn(getTeamInvitation);
  const acceptInvite = useServerFn(acceptTeamInvitation);
  const [tab, setTab] = useState<"signin" | "signup">(mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<SelfServiceRole>("landlord");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof inspectInvite>> | null>(
    null,
  );
  const [inviteLoading, setInviteLoading] = useState(Boolean(invite));
  const redirectTo = getRedirectTarget(redirect);

  const finishSignIn = useCallback(
    async (session: Session | null) => {
      let activeSession = session;
      for (let i = 0; i < 5 && !activeSession; i += 1) {
        const { data } = await supabase.auth.getSession();
        activeSession = data.session;
        if (!activeSession) await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
      if (!activeSession)
        throw new Error("Sign-in completed, but the session is still syncing. Please try again.");
      if (invite) {
        const result = await acceptInvite({ data: { token: invite } });
        if ("error" in result) throw new Error(result.error);
        toast.success("You have joined the agency team.");
      }
      await navigate({ to: redirectTo as never, replace: true });
    },
    [acceptInvite, invite, navigate, redirectTo],
  );

  useEffect(() => {
    let cancelled = false;
    if (!invite) {
      setInvitation(null);
      setInviteLoading(false);
      return;
    }
    setInviteLoading(true);
    void inspectInvite({ data: { token: invite } }).then((result) => {
      if (cancelled) return;
      setInvitation(result);
      if (result.valid) {
        setEmail(result.email);
        setTab("signup");
      }
      setInviteLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [inspectInvite, invite]);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session || inviteLoading) return;
      void finishSignIn(data.session).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to accept invitation");
      });
    });
    return () => {
      cancelled = true;
    };
  }, [finishSignIn, inviteLoading]);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result && "error" in result && result.error) {
        throw new Error(typeof result.error === "string" ? result.error : "Google sign-in failed");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handle = async () => {
    setBusy(true);
    try {
      if (tab === "signup") {
        const callback = new URL("/auth", window.location.origin);
        callback.searchParams.set("redirect", redirectTo);
        if (invite) callback.searchParams.set("invite", invite);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, role: invitation?.valid ? "inventory_clerk" : role },
            emailRedirectTo: callback.toString(),
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success(
            invitation?.valid
              ? "Account created — use the confirmation email to join the agency."
              : "Account created — check your email to continue.",
          );
          return;
        }
        toast.success("Account created — redirecting…");
        await finishSignIn(data.session);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await finishSignIn(data.session);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex brand-gradient text-white p-12 flex-col justify-between relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl relative z-10">
          <span className="bg-white/20 backdrop-blur inline-flex h-10 w-10 items-center justify-center rounded-lg">
            <Building2 className="h-5 w-5" />
          </span>
          Estately
        </Link>
        <div className="max-w-md relative z-10">
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            Your portfolio, your team — one calm workspace.
          </h1>
          <p className="text-white/80 text-lg">
            Marketplace, compliance and CRM. Estately is built for modern estate and letting
            agencies.
          </p>
        </div>
        <div className="text-sm text-white/60 relative z-10">
          © {new Date().getFullYear()} Estately
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md shadow-card border-0">
          <CardContent className="p-8">
            {inviteLoading && (
              <div className="mb-5 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking invitation…
              </div>
            )}
            {invite && !inviteLoading && invitation?.valid && (
              <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <UserPlus className="h-4 w-4 text-primary" /> Join {invitation.agencyName}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sign in or create an account as {invitation.email}. Your team role will be{" "}
                  {invitation.role}.
                </p>
              </div>
            )}
            {invite && !inviteLoading && !invitation?.valid && (
              <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                This invitation is invalid, expired or has already been used.
              </div>
            )}
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <div className="mb-6 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  <GoogleMark /> Continue with Google
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or use your email
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>

              <TabsContent value="signin" className="space-y-4 mt-0">
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  disabled={Boolean(invitation?.valid)}
                />
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  show={show}
                  setShow={setShow}
                />
                <Button className="w-full" onClick={handle} disabled={busy || !email || !password}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <Field id="name" label="Full name" value={name} onChange={setName} />
                <Field
                  id="email2"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  disabled={Boolean(invitation?.valid)}
                />
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  show={show}
                  setShow={setShow}
                />
                {!invitation?.valid && (
                  <div className="space-y-2">
                    <Label>I am a…</Label>
                    <Select value={role} onValueChange={(value) => {
                      if (isSelfServiceRole(value)) setRole(value);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landlord">Landlord / HMO operator</SelectItem>
                        <SelectItem value="agent">Letting / sales agent</SelectItem>
                        <SelectItem value="tenant">Tenant</SelectItem>
                        <SelectItem value="buyer">Buyer / renter</SelectItem>
                        <SelectItem value="conveyancer">Conveyancer / solicitor</SelectItem>
                        <SelectItem value="contractor">Trade / contractor</SelectItem>
                        <SelectItem value="inventory_clerk">
                          Inventory / EPC / Gas engineer
                        </SelectItem>
                        <SelectItem value="utility_provider">
                          Utility / referencing / insurance
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handle}
                  disabled={busy || !email || !password || !name}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  setShow,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="pw">Password</Label>
      <div className="relative">
        <Input
          id="pw"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
