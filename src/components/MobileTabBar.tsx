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
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 h-14">
        {tabs.map((t) => {
          const active = isActive(t.to);
          return (
            <li key={t.to} className="contents">
              <Link
                to={t.to}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <t.icon className={`h-5 w-5 ${active ? "" : ""}`} />
                <span className="leading-none">{t.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="contents">
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground"
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
