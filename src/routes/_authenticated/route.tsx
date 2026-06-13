import { createFileRoute, Outlet, redirect, useRouterState, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Bell, ChevronRight, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
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
          <header className="h-14 sm:h-16 flex items-center gap-3 border-b border-border/60 bg-card/70 backdrop-blur-md px-3 sm:px-6 sticky top-0 z-20">
            <SidebarTrigger className="shrink-0" />
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
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 h-9">
              <LifeBuoy className="h-4 w-4" /> Support
            </Button>
          </header>
          <main className="flex-1 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>
        <MobileTabBar />
      </div>
    </SidebarProvider>
  );
}
