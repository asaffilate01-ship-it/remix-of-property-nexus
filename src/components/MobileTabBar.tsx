import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Inbox, Wrench, Menu, Search, FileText, Gavel, ShieldCheck, Users, Heart } from "lucide-react";
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
  { to: "/portal/tenant", label: "Home", icon: LayoutDashboard },
  { to: "/work-orders", label: "Repairs", icon: Wrench },
  { to: "/documents", label: "Docs", icon: FileText },
  { to: "/inbox", label: "Messages", icon: Inbox },
];

const TABS_CONTRACTOR: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/work-orders", label: "Jobs", icon: Wrench },
  { to: "/contractor-marketplace", label: "Bid", icon: Building2 },
  { to: "/evidence", label: "Photos", icon: Inbox },
];

const TABS_LANDLORD: Tab[] = [
  { to: "/portal/landlord", label: "Home", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/tenancies", label: "Tenancies", icon: Users },
  { to: "/work-orders", label: "Repairs", icon: Wrench },
];

const TABS_AGENT: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Inbox },
  { to: "/listings", label: "Listings", icon: Building2 },
  { to: "/pipeline", label: "Pipeline", icon: Gavel },
];

const TABS_BUYER: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/marketplace", label: "Browse", icon: Search },
  { to: "/saved-searches", label: "Saved", icon: Heart },
  { to: "/vendor-portal", label: "Progress", icon: Gavel },
];

const TABS_CONVEYANCER: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/sales", label: "Matters", icon: Gavel },
  { to: "/documents", label: "Docs", icon: FileText },
  { to: "/inbox", label: "Messages", icon: Inbox },
];

const TABS_SIMPLE: Tab[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/work-orders", label: "Tasks", icon: Wrench },
  { to: "/evidence", label: "Evidence", icon: ShieldCheck },
  { to: "/inbox", label: "Messages", icon: Inbox },
];

function tabsFor(role: AppRole | null): Tab[] {
  switch (role) {
    case "tenant": return TABS_TENANT;
    case "contractor": return TABS_CONTRACTOR;
    case "landlord": return TABS_LANDLORD;
    case "agent": return TABS_AGENT;
    case "buyer": return TABS_BUYER;
    case "conveyancer": return TABS_CONVEYANCER;
    case "inventory_clerk":
    case "utility_provider": return TABS_SIMPLE;
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
                aria-current={active ? "page" : undefined}
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
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" />
            <span className="leading-none">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
