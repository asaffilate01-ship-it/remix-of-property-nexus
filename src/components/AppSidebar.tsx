import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Tag, Inbox, Kanban, ShieldCheck, Users, Settings, LogOut, BedDouble, Wrench, Contact, Handshake, Search, Heart, Home, Scale, ClipboardCheck, ClipboardList, CalendarDays, Gavel, Receipt, BarChart3, Sparkles, Eye, Bookmark, RefreshCcw, Vault, UserCheck, FilePenLine, Hammer, Banknote, Image, Landmark, Briefcase, Smartphone, PackageOpen } from "lucide-react";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const FULL: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/listings", label: "Listings", icon: Tag },
  { to: "/leads", label: "Leads", icon: Inbox },
  { to: "/viewings", label: "Viewings", icon: CalendarDays },
  { to: "/pipeline", label: "Lettings pipeline", icon: Kanban },
  { to: "/sales", label: "Sales pipeline", icon: Handshake },
  { to: "/offers", label: "Offers & chains", icon: Gavel },
  { to: "/hmo", label: "HMO", icon: BedDouble },
  { to: "/inspections", label: "Inspections", icon: ClipboardList },
  { to: "/renewals", label: "Renewals", icon: RefreshCcw },
  { to: "/deposits", label: "Deposits", icon: Vault },
  { to: "/right-to-rent", label: "Right to Rent", icon: UserCheck },
  { to: "/arrears", label: "Arrears", icon: Banknote },
  { to: "/work-orders", label: "Work orders", icon: Wrench },
  { to: "/contractor-marketplace", label: "Find a contractor", icon: Hammer },
  { to: "/e-sign", label: "E‑signatures", icon: FilePenLine },
  { to: "/statements", label: "Owner statements", icon: Receipt },
  { to: "/contacts", label: "Contacts", icon: Contact },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/ai-copy", label: "AI listing copy", icon: Sparkles },
  { to: "/agency", label: "Agency", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

const TENANT: NavItem[] = [
  { to: "/dashboard", label: "My home", icon: Home },
  { to: "/work-orders", label: "Repair requests", icon: Wrench },
  { to: "/compliance", label: "Documents", icon: ShieldCheck },
  { to: "/marketplace", label: "Browse homes", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
];

const CONTRACTOR: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/work-orders", label: "My jobs", icon: Wrench },
  { to: "/contractor-marketplace", label: "Bid on jobs", icon: Hammer },
  { to: "/settings", label: "Settings", icon: Settings },
];

const CONVEYANCER: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Matters", icon: Scale },
  { to: "/settings", label: "Settings", icon: Settings },
];

const BUYER: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Browse", icon: Search },
  { to: "/saved-searches", label: "Saved searches", icon: Bookmark },
  { to: "/vendor-portal", label: "My sale", icon: Eye },
  { to: "/leads", label: "My enquiries", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
];

const SIMPLE: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/work-orders", label: "Assignments", icon: ClipboardCheck },
  { to: "/settings", label: "Settings", icon: Settings },
];

function navFor(role: AppRole | null): NavItem[] {
  switch (role) {
    case "tenant": return TENANT;
    case "contractor": return CONTRACTOR;
    case "conveyancer": return CONVEYANCER;
    case "buyer": return BUYER;
    case "inventory_clerk":
    case "utility_provider":
      return SIMPLE;
    default: return FULL;
  }
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const collapsed = state === "collapsed";
  const { role } = useUserRole();
  const items = navFor(role);

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
        {!collapsed && (role === "agent" || role === "admin" || role === "landlord") && (
          <div className="px-2 pb-2"><BranchSwitcher /></div>
        )}
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
