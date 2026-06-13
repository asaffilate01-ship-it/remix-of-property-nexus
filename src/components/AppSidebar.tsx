import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Tag, Inbox, Kanban, ShieldCheck, Users, Settings, LogOut,
  BedDouble, Wrench, Contact, Handshake, Search, Heart, Home, Scale, ClipboardCheck,
  ClipboardList, CalendarDays, Gavel, Receipt, BarChart3, Sparkles, Eye, Bookmark,
  RefreshCcw, Vault, UserCheck, FilePenLine, Hammer, Banknote, Image as ImageIcon,
  Landmark, Briefcase, Smartphone, PackageOpen, FolderLock, Camera, ScrollText,
  ChevronRight,
} from "lucide-react";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useMemo, useState } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavSection = { label: string; items: NavItem[]; defaultOpen?: boolean };

const FULL: NavSection[] = [
  {
    label: "Overview", defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Properties & listings", defaultOpen: true,
    items: [
      { to: "/properties", label: "Properties", icon: Building2 },
      { to: "/listings", label: "Listings", icon: Tag },
      { to: "/hmo", label: "HMO", icon: BedDouble },
      { to: "/commercial", label: "Commercial", icon: Briefcase },
      { to: "/media", label: "Floorplans & EPC", icon: ImageIcon },
      { to: "/ai-copy", label: "AI listing copy", icon: Sparkles },
    ],
  },
  {
    label: "Pipeline & deals",
    items: [
      { to: "/leads", label: "Leads", icon: Inbox },
      { to: "/viewings", label: "Viewings", icon: CalendarDays },
      { to: "/pipeline", label: "Lettings pipeline", icon: Kanban },
      { to: "/sales", label: "Sales pipeline", icon: Handshake },
      { to: "/offers", label: "Offers & chains", icon: Gavel },
    ],
  },
  {
    label: "Tenancy ops",
    items: [
      { to: "/inspections", label: "Inspections", icon: ClipboardList },
      { to: "/mobile-inspection", label: "On‑site inspection", icon: Smartphone },
      { to: "/move", label: "Move in / out", icon: PackageOpen },
      { to: "/renewals", label: "Renewals", icon: RefreshCcw },
      { to: "/arrears", label: "Arrears", icon: Banknote },
      { to: "/work-orders", label: "Work orders", icon: Wrench },
      { to: "/contractor-marketplace", label: "Find a contractor", icon: Hammer },
      { to: "/survey", label: "Survey & site capture", icon: Camera },
    ],
  },
  {
    label: "Compliance & docs",
    items: [
      { to: "/compliance", label: "Compliance", icon: ShieldCheck },
      { to: "/referencing-cases", label: "Referencing", icon: ClipboardCheck },
      { to: "/right-to-rent", label: "Right to Rent", icon: UserCheck },
      { to: "/deposits", label: "Deposits", icon: Vault },
      { to: "/leasehold", label: "Leasehold register", icon: Landmark },
      { to: "/templates", label: "Document templates", icon: ScrollText },
      { to: "/e-sign", label: "E‑signatures", icon: FilePenLine },
      { to: "/documents", label: "Document vault", icon: FolderLock },
      { to: "/evidence", label: "Evidence capture", icon: Camera },
      { to: "/statements", label: "Owner statements", icon: Receipt },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/contacts", label: "Contacts", icon: Contact },
      { to: "/agency", label: "Agency", icon: Users },
      { to: "/branches", label: "Branches", icon: Building2 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const TENANT: NavSection[] = [{ label: "Home", defaultOpen: true, items: [
  { to: "/dashboard", label: "My home", icon: Home },
  { to: "/work-orders", label: "Repair requests", icon: Wrench },
  { to: "/survey", label: "Photo / video capture", icon: Camera },
  { to: "/evidence", label: "Photo / video proof", icon: Camera },
  { to: "/documents", label: "My documents", icon: FolderLock },
  { to: "/marketplace", label: "Browse homes", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
] }];

const CONTRACTOR: NavSection[] = [{ label: "Jobs", defaultOpen: true, items: [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/work-orders", label: "My jobs", icon: Wrench },
  { to: "/evidence", label: "Site photos / video", icon: Camera },
  { to: "/contractor-marketplace", label: "Bid on jobs", icon: Hammer },
  { to: "/settings", label: "Settings", icon: Settings },
] }];

const CONVEYANCER: NavSection[] = [{ label: "Matters", defaultOpen: true, items: [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Matters", icon: Scale },
  { to: "/settings", label: "Settings", icon: Settings },
] }];

const BUYER: NavSection[] = [{ label: "Buying", defaultOpen: true, items: [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Browse", icon: Search },
  { to: "/saved-searches", label: "Saved searches", icon: Bookmark },
  { to: "/vendor-portal", label: "My sale", icon: Eye },
  { to: "/leads", label: "My enquiries", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
] }];

const SIMPLE: NavSection[] = [{ label: "Work", defaultOpen: true, items: [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/work-orders", label: "Assignments", icon: ClipboardCheck },
  { to: "/settings", label: "Settings", icon: Settings },
] }];

// Admin = platform oversight + everything
const ADMIN: NavSection[] = [
  { label: "Platform", defaultOpen: true, items: [
    { to: "/dashboard", label: "Admin dashboard", icon: LayoutDashboard },
    { to: "/agency", label: "Users & agencies", icon: Users },
    { to: "/branches", label: "Branches", icon: Building2 },
    { to: "/reports", label: "Platform reports", icon: BarChart3 },
    { to: "/compliance", label: "Compliance oversight", icon: ShieldCheck },
  ] },
  ...FULL.slice(1), // re-use all operational sections after Overview
];

// Agent = pipeline-first
const AGENT: NavSection[] = [
  { label: "Today", defaultOpen: true, items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/leads", label: "Leads", icon: Inbox },
    { to: "/viewings", label: "Viewings", icon: CalendarDays },
    { to: "/pipeline", label: "Lettings pipeline", icon: Kanban },
    { to: "/sales", label: "Sales pipeline", icon: Handshake },
    { to: "/offers", label: "Offers & chains", icon: Gavel },
  ] },
  { label: "Stock", defaultOpen: true, items: [
    { to: "/listings", label: "Listings", icon: Tag },
    { to: "/properties", label: "Properties", icon: Building2 },
    { to: "/media", label: "Floorplans & EPC", icon: ImageIcon },
    { to: "/ai-copy", label: "AI listing copy", icon: Sparkles },
  ] },
  { label: "Ops", items: [
    { to: "/inspections", label: "Inspections", icon: ClipboardList },
    { to: "/work-orders", label: "Work orders", icon: Wrench },
    { to: "/renewals", label: "Renewals", icon: RefreshCcw },
    { to: "/arrears", label: "Arrears", icon: Banknote },
    { to: "/referencing-cases", label: "Referencing", icon: ClipboardCheck },
  ] },
  { label: "Workspace", items: [
    { to: "/contacts", label: "Contacts", icon: Contact },
    { to: "/branches", label: "Branches", icon: Building2 },
    { to: "/agency", label: "Team", icon: Users },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/settings", label: "Settings", icon: Settings },
  ] },
];

// Landlord = portfolio-first (slimmer than agent)
const LANDLORD: NavSection[] = [
  { label: "Portfolio", defaultOpen: true, items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/properties", label: "Properties", icon: Building2 },
    { to: "/hmo", label: "HMO & rooms", icon: BedDouble },
    { to: "/listings", label: "Listings", icon: Tag },
  ] },
  { label: "Tenancy ops", defaultOpen: true, items: [
    { to: "/leads", label: "Enquiries", icon: Inbox },
    { to: "/work-orders", label: "Work orders", icon: Wrench },
    { to: "/contractor-marketplace", label: "Find a contractor", icon: Hammer },
    { to: "/inspections", label: "Inspections", icon: ClipboardList },
    { to: "/renewals", label: "Renewals", icon: RefreshCcw },
    { to: "/arrears", label: "Arrears", icon: Banknote },
  ] },
  { label: "Compliance & money", items: [
    { to: "/compliance", label: "Compliance", icon: ShieldCheck },
    { to: "/deposits", label: "Deposits", icon: Vault },
    { to: "/statements", label: "Statements", icon: Receipt },
    { to: "/documents", label: "Documents", icon: FolderLock },
  ] },
  { label: "Workspace", items: [
    { to: "/contacts", label: "Contacts", icon: Contact },
    { to: "/settings", label: "Settings", icon: Settings },
  ] },
];

function sectionsFor(role: AppRole | null): NavSection[] {
  switch (role) {
    case "admin": return ADMIN;
    case "agent": return AGENT;
    case "landlord": return LANDLORD;
    case "tenant": return TENANT;
    case "contractor": return CONTRACTOR;
    case "conveyancer": return CONVEYANCER;
    case "buyer": return BUYER;
    case "inventory_clerk":
    case "utility_provider": return SIMPLE;
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
  const sections = sectionsFor(role);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [query, sections]);

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

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
        {!collapsed && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to…"
                className="h-8 pl-7 text-xs bg-sidebar-accent/40 border-sidebar-border"
              />
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {filtered.map((section) => {
          const hasActive = section.items.some((i) => isActive(i.to));
          const open = !!query || section.defaultOpen || hasActive;
          if (collapsed) {
            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((i) => (
                      <SidebarMenuItem key={i.to}>
                        <SidebarMenuButton asChild isActive={isActive(i.to)} tooltip={i.label}>
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
            );
          }
          return (
            <Collapsible key={section.label} defaultOpen={open} className="group/section">
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:text-sidebar-foreground transition-colors">
                    <span>{section.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/section:rotate-90" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((i) => (
                        <SidebarMenuItem key={i.to}>
                          <SidebarMenuButton asChild isActive={isActive(i.to)}>
                            <Link to={i.to}>
                              <i.icon className="h-4 w-4" />
                              <span>{i.label}</span>
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
          <div className="px-4 py-6 text-xs text-muted-foreground">No matches for “{query}”.</div>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut className="h-4 w-4" /> <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
