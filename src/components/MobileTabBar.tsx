import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocale } from "@/hooks/useLocale";
import { useUserRole } from "@/hooks/useUserRole";
import { translateUi } from "@/lib/locale";
import { mobileTabsForRole } from "@/lib/navigation";

export function MobileTabBar() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { setOpenMobile } = useSidebar();
  const { role, loading } = useUserRole();
  const { locale } = useLocale();
  const tabs = mobileTabsForRole(role);
  const isActive = (to: string) => path === to || path.startsWith(`${to}/`);

  if (loading || !role || tabs.length === 0) return null;

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-5">
        {tabs.map((tab) => {
          const active = isActive(tab.to);
          return (
            <li key={tab.to} className="contents">
              <Link
                to={tab.to as never}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span
                    className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary"
                    aria-hidden="true"
                  />
                )}
                <tab.icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate px-1 leading-none">
                  {translateUi(locale, tab.label)}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="contents">
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            aria-label="Open full navigation menu"
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="leading-none">{translateUi(locale, "More")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
