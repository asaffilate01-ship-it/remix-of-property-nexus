import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Lock, Loader2 } from "lucide-react";
import { unlockSite } from "@/lib/gate.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Private preview access — Estately" },
      { name: "description", content: "Enter the preview password to access the Estately platform." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Private preview access — Estately" },
      { property: "og:description", content: "Enter the preview password to access the Estately platform." },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");

  async function submit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(false);
    try {
      const { ok } = await unlock({ data: { password } });
      if (!ok) {
        setError(true);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-accent/10 via-background to-accent/5 px-4">
      <Card className="w-full max-w-md border-border/60 shadow-2xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-accent" />
            <span className="font-display text-lg font-bold tracking-tight">Estately</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-accent/10 grid place-items-center mb-5">
            <Lock className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Private preview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The full platform is in private preview. Enter the access password to continue.
          </p>
          <form method="post" onSubmit={submit} className="mt-6 space-y-3">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Access password"
              aria-label="Access password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                That password isn&rsquo;t right. Try again.
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Enter platform
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">
            No password yet?{" "}
            <Link to="/" className="font-medium text-accent">
              Back to the overview
            </Link>{" "}
            and request access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
