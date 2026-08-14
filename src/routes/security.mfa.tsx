import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Building2, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isCompleteMfaCode,
  normalizeMfaCode,
  safeMfaQrCode,
  safeMfaRedirect,
} from "@/lib/auth-security";

const searchSchema = z.object({
  redirect: z.string().max(2_000).optional(),
  status: z.enum(["authorization-required"]).optional(),
});

type Setup = {
  factorId: string;
  qrCode: string | null;
  secret: string;
};

export const Route = createFileRoute("/security/mfa")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Secure your account — Estately" }] }),
  component: MfaPage,
});

function MfaPage() {
  const { redirect: requestedRedirect, status } = useSearch({ from: "/security/mfa" });
  const navigate = useNavigate();
  const redirectTo = safeMfaRedirect(requestedRedirect);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const started = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) {
      setError("Unable to check account security. Please refresh and try again.");
      setLoading(false);
      return;
    }
    if (assurance.data.currentLevel === "aal2") {
      setAlreadyVerified(true);
      setLoading(false);
      return;
    }

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setError("Unable to load authenticator settings. Please refresh and try again.");
      setLoading(false);
      return;
    }
    const verified = factors.data.totp.find((factor) => factor.status === "verified");
    if (verified) {
      setVerifiedFactorId(verified.id);
      setLoading(false);
      return;
    }

    for (const factor of factors.data.totp.filter((item) => item.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const enrollment = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Estately authenticator",
    });
    if (enrollment.error) {
      setError("Unable to start authenticator setup. Please try again.");
      setLoading(false);
      return;
    }
    setSetup({
      factorId: enrollment.data.id,
      qrCode: safeMfaQrCode(enrollment.data.totp.qr_code),
      secret: enrollment.data.totp.secret,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  const verify = async () => {
    const factorId = verifiedFactorId ?? setup?.factorId;
    if (!factorId || !isCompleteMfaCode(code)) return;
    setBusy(true);
    setError(null);
    const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (result.error) {
      setError("That code was not accepted. Wait for a fresh code and try again.");
      setBusy(false);
      return;
    }
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) {
      setError("Verification succeeded, but the secure session could not be refreshed.");
      setBusy(false);
      return;
    }
    await navigate({ to: redirectTo as never, replace: true });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          Estately
        </div>
        <Card className="border-0 shadow-elevated">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold">Secure your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Platform administrators must use an authenticator code for every elevated session.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center" aria-live="polite">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="sr-only">Loading security settings</span>
              </div>
            ) : error && !setup && !verifiedFactorId && !alreadyVerified ? (
              <div className="space-y-4">
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
                >
                  {error}
                </p>
                <Button variant="outline" className="w-full" onClick={load}>
                  Try again
                </Button>
              </div>
            ) : alreadyVerified && status === "authorization-required" ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
                >
                  <p className="font-medium">Administrator approval is required</p>
                  <p className="mt-1 text-muted-foreground">
                    MFA is verified, but this account has not been explicitly authorized as a
                    platform operator. Ask an existing system owner to follow the service-role
                    provisioning runbook.
                  </p>
                </div>
              </div>
            ) : alreadyVerified ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  This session is protected with multi-factor authentication.
                </div>
                <Button
                  className="w-full"
                  onClick={() => navigate({ to: redirectTo as never, replace: true })}
                >
                  Continue securely
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {setup ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Scan this code with Google Authenticator, Microsoft Authenticator, 1Password
                      or another TOTP app.
                    </p>
                    {setup.qrCode && (
                      <div className="mx-auto w-fit rounded-xl border bg-white p-3">
                        <img
                          src={setup.qrCode}
                          alt="Authenticator setup QR code"
                          className="h-48 w-48"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div>
                      <Label>Manual setup key</Label>
                      <code
                        className="mt-1 block break-all rounded-md bg-muted p-3 text-xs"
                        aria-label="Manual authenticator setup key"
                      >
                        {setup.secret}
                      </code>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enter the current six-digit code from your authenticator app.
                  </p>
                )}

                <div>
                  <Label htmlFor="mfa-code">Six-digit code</Label>
                  <div className="relative mt-1.5">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mfa-code"
                      value={code}
                      onChange={(event) => setCode(normalizeMfaCode(event.target.value))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="h-12 pl-10 text-center text-lg tracking-[0.35em]"
                      autoFocus
                    />
                  </div>
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  className="w-full"
                  onClick={verify}
                  disabled={busy || !isCompleteMfaCode(code)}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and continue
                </Button>
              </div>
            )}

            {!loading && error && alreadyVerified && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button variant="ghost" className="mt-4 w-full text-muted-foreground" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
