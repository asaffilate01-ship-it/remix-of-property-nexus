import { createFileRoute, Outlet, redirect, useRouterState, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { CommandPalette } from "@/components/CommandPalette";
import { ChevronRight, LifeBuoy, Search } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { WorkspaceAccessGate } from "@/components/WorkspaceAccessGate";

import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      return { user: sessionData.session.user };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

const LABELS: Record<string, string> = {
  dashboard: "Dashboard", properties: "Properties", listings: "Listings", hmo: "HMO",
  commercial: "Commercial", media: "Floorplans & EPC", "ai-copy": "AI copy",
  leads: "Leads", viewings: "Viewings", pipeline: "Pipeline", sales: "Sales",
  offers: "Offers", tenancies: "Tenancies", inspections: "Inspections",
  "mobile-inspection": "On-site inspection", move: "Move in / out",
  renewals: "Renewals", arrears: "Arrears", "work-orders": "Work orders",
  "contractor-marketplace": "Contractor marketplace", survey: "Survey",
  compliance: "Compliance", "referencing-cases": "Referencing",
  "right-to-rent": "Right to Rent", deposits: "Deposits",
  leasehold: "Leasehold", templates: "Templates", "e-sign": "E-signatures",
  documents: "Documents", evidence: "Evidence", statements: "Statements",
  contacts: "Contacts", agency: "Agency", branches: "Branches",
  team: "Team",
  settings: "Settings", reports: "Reports", "vendor-portal": "Vendor portal",
  "saved-searches": "Saved searches",
};

function useCrumbs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return useMemo(() => {
    const parts = path.split("/").filter(Boolean);
    return parts.map((seg, i) => ({
      to: "/" + parts.slice(0, i + 1).join("/"),
      label: LABELS[seg] ?? decodeURIComponent(seg).replace(/-/g, " "),
    }));
  }, [path]);
}

function AuthedLayout() {
  const crumbs = useCrumbs();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-14 sm:h-16 flex items-center gap-2 sm:gap-3 border-b border-border/60 bg-card/70 backdrop-blur-md px-3 sm:px-6 sticky top-0 z-20"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <SidebarTrigger className="shrink-0" />
            {crumbs.length > 0 && (
              <h1 className="sm:hidden truncate text-sm font-semibold text-foreground capitalize min-w-0 flex-1">
                {crumbs[crumbs.length - 1].label}
              </h1>
            )}
            {crumbs.length > 1 && (
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground min-w-0">
                {crumbs.map((c, i) => {
                  const last = i === crumbs.length - 1;
                  return (
                    <span key={c.to} className="flex items-center gap-1.5 min-w-0">
                      {i > 0 && <ChevronRight className="h-3 w-3 opacity-50 shrink-0" />}
                      {last ? (
                        <span className="text-foreground truncate capitalize">{c.label}</span>
                      ) : (
                        <Link to={c.to} className="hover:text-foreground truncate capitalize">{c.label}</Link>
                      )}
                    </span>
                  );
                })}
              </nav>
            )}
            <div className="hidden sm:block flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
              className="hidden md:inline-flex items-center gap-2 h-9 text-muted-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="ml-2 text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
              className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </Button>
            <NotificationBell />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 h-9">
              <Link to="/contact">
                <LifeBuoy className="h-4 w-4" /> Support
              </Link>
            </Button>

          </header>
          <main className="flex-1 pb-24 md:pb-10">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
              <WorkspaceAccessGate><Outlet /></WorkspaceAccessGate>
            </div>
          </main>
        </div>
        <MobileTabBar />
        <CommandPalette />
      </div>
    </SidebarProvider>
  );
}
