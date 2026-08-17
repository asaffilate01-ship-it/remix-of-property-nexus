import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Automations — Gabley" }] }),
  component: AutomationsLayout,
});

function AutomationsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tab = (p: string) => pathname === p || pathname.startsWith(p + "/");
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <Link
          to="/automations"
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${pathname === "/automations" ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Tracks
        </Link>
        <Link
          to="/automations/runs"
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab("/automations/runs") ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Active runs
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
