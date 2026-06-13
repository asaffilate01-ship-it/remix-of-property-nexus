import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Inbox, Wrench, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

type Tab = { to: string; label: string; icon: typeof LayoutDashboard };

const TABS_FULL: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/leads", label: "Leads", icon: Inbox },
  { to: "/work-orders", label: "Jobs", icon: Wrench },
];

const TABS_TENANT: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/work-orders", label: "Repairs", icon: Wrench },
  { to: "/marketplace", label: "Browse", icon: Building2 },
  { to: "/documents", label: "Docs", icon: Inbox },
];

const TABS_CONTRACTOR: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/work-orders", label: "Jobs", icon: Wrench },
  { to: "/contractor-marketplace", label: "Bid", icon: Building2 },
  { to: "/evidence", label: "Photos", icon: Inbox },
];

function tabsFor(role: AppRole | null): Tab[] {
  switch (role) {
    case "tenant": return TABS_TENANT;
    case "contractor": return TABS_CONTRACTOR;
    default: return TABS_FULL;
  }
}

export function MobileTabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile } = useSidebar();
  const { role } = useUserRole();
  const tabs = tabsFor(role);
  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 h-16">
        {tabs.map((t) => {
          const active = isActive(t.to);
          return (
            <li key={t.to} className="contents">
              <Link
                to={t.to}
                className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors min-h-11 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary" />}
                <t.icon className="h-5 w-5" />
                <span className="leading-none">{t.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="contents">
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground min-h-11"
            aria-label="Open full menu"
          >
            <Menu className="h-5 w-5" />
            <span className="leading-none">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
