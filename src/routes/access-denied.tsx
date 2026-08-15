import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, House, LifeBuoy, Loader2, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { homePathForRole } from "@/lib/route-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AccessDeniedSearch = { from?: string };

function validateSearch(search: Record<string, unknown>): AccessDeniedSearch {
  const value = typeof search.from === "string" ? search.from.slice(0, 500) : undefined;
  const from =
    value?.startsWith("/") && !value.startsWith("//") ? value.split(/[?#]/, 1)[0] : undefined;
  return from ? { from } : {};
}

export const Route = createFileRoute("/access-denied")({
  ssr: false,
  validateSearch,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  head: () => ({
    meta: [
      { title: "Access restricted — Estately" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccessDeniedPage,
});

function roleLabel(role: string): string {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AccessDeniedPage() {
  const { from } = Route.useSearch();
  const { role, loading, error } = useUserRole();
  const home = role ? homePathForRole(role) : "/dashboard";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <Card className="relative w-full max-w-lg overflow-hidden border-border/60 shadow-elevated">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-7 text-center sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/15">
            <ShieldX aria-hidden="true" className="h-7 w-7" />
          </div>
          <Badge variant="outline" className="mt-5">
            Protected workspace
          </Badge>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            That page isn&apos;t available for your role
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your account is signed in, but it doesn&apos;t have permission to open this part of the
            workspace. No data was loaded.
          </p>
          {from && (
            <p
              className="mx-auto mt-4 max-w-full truncate rounded-md bg-muted/70 px-3 py-2 font-mono text-xs text-muted-foreground"
              title={from}
            >
              {from}
            </p>
          )}
          <div className="mt-5 min-h-6 text-sm text-muted-foreground" aria-live="polite">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Checking your
                workspace role…
              </span>
            ) : role ? (
              <span>
                Signed in as{" "}
                <strong className="font-semibold text-foreground">{roleLabel(role)}</strong>
              </span>
            ) : (
              <span>{error ?? "No workspace role is assigned to this account."}</span>
            )}
          </div>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            {role ? (
              <Button asChild>
                <Link to={home}>
                  <House aria-hidden="true" className="mr-2 h-4 w-4" />
                  Go to my workspace
                  <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button disabled>
                <House aria-hidden="true" className="mr-2 h-4 w-4" />
                {loading ? "Checking workspace…" : "Workspace unavailable"}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/contact">
                <LifeBuoy aria-hidden="true" className="mr-2 h-4 w-4" /> Contact support
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            If you believe this is incorrect, ask your workspace administrator to review your role.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
