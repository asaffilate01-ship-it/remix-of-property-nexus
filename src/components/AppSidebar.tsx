import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Tag, Inbox, Kanban, ShieldCheck, Users, Settings, LogOut } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/listings", label: "Listings", icon: Tag },
  { to: "/leads", label: "Leads", icon: Inbox },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/agency", label: "Agency", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const collapsed = state === "collapsed";

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <span className="brand-gradient inline-flex h-8 w-8 items-center justify-center rounded-md text-white shrink-0">
            <Building2 className="h-4 w-4" />
          </span>
          {!collapsed && <span className="font-bold text-sidebar-foreground tracking-tight">Estately</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.to}>
                  <SidebarMenuButton asChild isActive={path === i.to || path.startsWith(i.to + "/")}>
                    <Link to={i.to}>
                      <i.icon className="h-4 w-4" />
                      <span>{i.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" /> <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
