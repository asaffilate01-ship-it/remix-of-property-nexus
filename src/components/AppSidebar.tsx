import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, Clock, Loader2, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useRecentRoutes, trackRoute } from "@/hooks/useRecentRoutes";
import { useLocale } from "@/hooks/useLocale";
import { navigationSectionsForRole } from "@/lib/navigation";
import { translateUi } from "@/lib/locale";

export function AppSidebar() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { state, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const collapsed = state === "collapsed";
  const { role, name, loading, error: roleError } = useUserRole();
  const { locale } = useLocale();
  const sections = useMemo(() => navigationSectionsForRole(role), [role]);
  const [query, setQuery] = useState("");
  const { items: recent } = useRecentRoutes();

  useEffect(() => {
    if (!path || loading) return;
    const allItems = sections.flatMap((section) => section.items);
    const exact = allItems.find((item) => item.to === path);
    if (exact) {
      trackRoute(exact.to, exact.label);
      return;
    }
    const parent = allItems.find((item) => path.startsWith(`${item.to}/`));
    if (parent) trackRoute(path, `${parent.label} detail`);
  }, [loading, path, sections]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          translateUi(locale, item.label).toLocaleLowerCase(locale).includes(normalizedQuery),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [locale, query, sections]);

  const isActive = (to: string) => path === to || path.startsWith(`${to}/`);
  const closeMobileMenu = () => setOpenMobile(false);

  const signOut = async () => {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut().catch(() => supabase.auth.signOut({ scope: "local" }));
      if (typeof window !== "undefined") window.location.replace("/auth");
      else await navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign out failed");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label="Gabley home"
          onClick={closeMobileMenu}
        >
          <span className="brand-gradient inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="font-bold tracking-tight text-sidebar-foreground">Gabley</span>
          )}
        </Link>
        {!collapsed &&
          !loading &&
          (role === "agent" || role === "admin" || role === "landlord") && (
            <div className="px-2 pb-2">
              <BranchSwitcher />
            </div>
          )}
        {!collapsed && !loading && role && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter menu…"
                aria-label="Filter navigation menu"
                className="h-9 border-sidebar-border bg-sidebar-accent/40 pl-8 pr-12 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-ring/40"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border border-sidebar-border/60 bg-sidebar/60 px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/50 sm:inline-flex">
                Ctrl K
              </kbd>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {loading ? (
          <div
            className="flex min-h-40 items-center justify-center text-sidebar-foreground/60"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading your authorised navigation</span>
          </div>
        ) : roleError || !role ? (
          <div
            className="mx-3 my-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"
            role="alert"
          >
            {roleError ?? "No authorised navigation is available."} Refresh the page or contact your
            workspace administrator.
          </div>
        ) : (
          <>
            {!collapsed && !query && recent.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>{translateUi(locale, "Recent")}</span>
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {recent.slice(0, 4).map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive(item.to)}>
                          <Link
                            to={item.to as never}
                            aria-current={isActive(item.to) ? "page" : undefined}
                            onClick={closeMobileMenu}
                          >
                            <Clock className="h-4 w-4 opacity-60" aria-hidden="true" />
                            <span className="truncate capitalize">
                              {translateUi(locale, item.label)}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {filtered.map((section) => {
              const hasActive = section.items.some((item) => isActive(item.to));
              const open = Boolean(query) || section.defaultOpen || hasActive;

              if (collapsed) {
                return (
                  <SidebarGroup key={section.label}>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {section.items.map((item) => (
                          <SidebarMenuItem key={item.to}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive(item.to)}
                              tooltip={translateUi(locale, item.label)}
                            >
                              <Link
                                to={item.to as never}
                                aria-current={isActive(item.to) ? "page" : undefined}
                                onClick={closeMobileMenu}
                              >
                                <item.icon className="h-4 w-4" aria-hidden="true" />
                                <span>{translateUi(locale, item.label)}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              }

              return (
                <Collapsible key={section.label} defaultOpen={open} className="group/section">
                  <SidebarGroup>
                    <CollapsibleTrigger className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                      <span>{translateUi(locale, section.label)}</span>
                      <ChevronRight
                        className="h-3.5 w-3.5 transition-transform group-data-[state=open]/section:rotate-90"
                        aria-hidden="true"
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {section.items.map((item) => (
                            <SidebarMenuItem key={item.to}>
                              <SidebarMenuButton asChild isActive={isActive(item.to)}>
                                <Link
                                  to={item.to as never}
                                  aria-current={isActive(item.to) ? "page" : undefined}
                                  onClick={closeMobileMenu}
                                >
                                  <item.icon className="h-4 w-4" aria-hidden="true" />
                                  <span>{translateUi(locale, item.label)}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              );
            })}

            {!collapsed && filtered.length === 0 && (
              <div className="px-4 py-6 text-xs text-muted-foreground" role="status">
                No menu matches “{query}”.
              </div>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-0">
        {!collapsed && !loading && role && (
          <div className="px-3 pb-2 pt-3">
            <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/40">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 text-xs font-semibold text-sidebar-primary ring-1 ring-sidebar-border">
                {(name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-sidebar-foreground">
                  {name || "Account"}
                </p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                  {role.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>
        )}
        <SidebarMenu className="px-2 pb-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip={translateUi(locale, "Sign out")}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{translateUi(locale, "Sign out")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
