import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  BedDouble,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  ClipboardCheck,
  ClipboardList,
  Contact,
  Eye,
  FilePenLine,
  FileText,
  FolderLock,
  Gavel,
  Hammer,
  Handshake,
  Heart,
  Home,
  Image as ImageIcon,
  Inbox,
  Kanban,
  Landmark,
  LayoutDashboard,
  PackageOpen,
  Plus,
  Receipt,
  RefreshCcw,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  UserCheck,
  Users,
  Vault,
  Workflow,
  Wrench,
} from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

export type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
  defaultOpen?: boolean;
};

export type NavigationAction = NavigationItem & {
  description: string;
  search?: Record<string, boolean>;
};

export type SearchResource = "properties" | "contacts" | "listings" | "leads" | "workOrders";

export const APP_ROLES: AppRole[] = [
  "admin",
  "agent",
  "landlord",
  "tenant",
  "buyer",
  "conveyancer",
  "contractor",
  "inventory_clerk",
  "utility_provider",
];

const FULL: NavigationSection[] = [
  {
    label: "Overview",
    defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/alerts", label: "Alerts & expiries", icon: Bell },
      { to: "/automations", label: "Automations", icon: Workflow },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Properties & listings",
    defaultOpen: true,
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
      { to: "/buyers", label: "Buyers", icon: Users },
      { to: "/sellers", label: "Sellers", icon: Handshake },
      { to: "/viewings", label: "Viewings", icon: CalendarDays },
      { to: "/pipeline", label: "Lettings pipeline", icon: Kanban },
      { to: "/sales", label: "Sales pipeline", icon: Handshake },
      { to: "/offers", label: "Offers & chains", icon: Gavel },
    ],
  },
  {
    label: "Tenancy ops",
    items: [
      { to: "/tenancies", label: "Tenancies", icon: Home },
      { to: "/tenants", label: "Tenants", icon: Users },
      { to: "/holiday-lets", label: "Holiday lets", icon: Sun },
      { to: "/inspections", label: "Inspections", icon: ClipboardList },
      { to: "/mobile-inspection", label: "On-site inspection", icon: Smartphone },
      { to: "/move", label: "Move in / out", icon: PackageOpen },
      { to: "/renewals", label: "Renewals", icon: RefreshCcw },
      { to: "/arrears", label: "Arrears", icon: Banknote },
      { to: "/banking", label: "Bank reconciliation", icon: Landmark },
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
      { to: "/templates", label: "Document templates", icon: FileText },
      { to: "/e-sign", label: "E-signatures", icon: FilePenLine },
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
      { to: "/team", label: "Team", icon: Users },
      { to: "/branches", label: "Branches", icon: Building2 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const TENANT: NavigationSection[] = [
  {
    label: "Home",
    defaultOpen: true,
    items: [
      { to: "/portal/tenant", label: "My tenancy", icon: Home },
      { to: "/inbox", label: "Messages", icon: Inbox },
      { to: "/work-orders", label: "Repair requests", icon: Wrench },
      { to: "/survey", label: "Photo / video capture", icon: Camera },
      { to: "/evidence", label: "Photo / video proof", icon: Camera },
      { to: "/documents", label: "My documents", icon: FolderLock },
      { to: "/marketplace", label: "Browse homes", icon: Search },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const CONTRACTOR: NavigationSection[] = [
  {
    label: "Jobs",
    defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/work-orders", label: "My jobs", icon: Wrench },
      { to: "/evidence", label: "Site photos / video", icon: Camera },
      { to: "/contractor-marketplace", label: "Bid on jobs", icon: Hammer },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const CONVEYANCER: NavigationSection[] = [
  {
    label: "Matters",
    defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/sales", label: "Matters", icon: Scale },
      { to: "/documents", label: "Documents", icon: FileText },
      { to: "/inbox", label: "Messages", icon: Inbox },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const BUYER: NavigationSection[] = [
  {
    label: "Buying",
    defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/marketplace", label: "Browse", icon: Search },
      { to: "/saved-searches", label: "Saved searches", icon: Bookmark },
      { to: "/vendor-portal", label: "My sale", icon: Eye },
      { to: "/leads", label: "My enquiries", icon: Heart },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const SIMPLE: NavigationSection[] = [
  {
    label: "Work",
    defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/work-orders", label: "Assignments", icon: ClipboardCheck },
      { to: "/evidence", label: "Evidence", icon: Camera },
      { to: "/inbox", label: "Messages", icon: Inbox },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const AGENT: NavigationSection[] = [
  {
    label: "Today",
    defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/leads", label: "Leads", icon: Inbox },
      { to: "/viewings", label: "Viewings", icon: CalendarDays },
      { to: "/pipeline", label: "Lettings pipeline", icon: Kanban },
      { to: "/sales", label: "Sales pipeline", icon: Handshake },
      { to: "/offers", label: "Offers & chains", icon: Gavel },
    ],
  },
  {
    label: "Stock",
    defaultOpen: true,
    items: [
      { to: "/listings", label: "Listings", icon: Tag },
      { to: "/properties", label: "Properties", icon: Building2 },
      { to: "/media", label: "Floorplans & EPC", icon: ImageIcon },
      { to: "/ai-copy", label: "AI listing copy", icon: Sparkles },
    ],
  },
  {
    label: "Ops",
    items: [
      { to: "/inspections", label: "Inspections", icon: ClipboardList },
      { to: "/work-orders", label: "Work orders", icon: Wrench },
      { to: "/renewals", label: "Renewals", icon: RefreshCcw },
      { to: "/arrears", label: "Arrears", icon: Banknote },
      { to: "/banking", label: "Bank reconciliation", icon: Landmark },
      { to: "/referencing-cases", label: "Referencing", icon: ClipboardCheck },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/contacts", label: "Contacts", icon: Contact },
      { to: "/branches", label: "Branches", icon: Building2 },
      { to: "/agency", label: "Agency profile", icon: Users },
      { to: "/team", label: "Team", icon: Users },
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const LANDLORD: NavigationSection[] = [
  {
    label: "Portfolio",
    defaultOpen: true,
    items: [
      { to: "/portal/landlord", label: "Overview", icon: LayoutDashboard },
      { to: "/inbox", label: "Messages", icon: Inbox },
      { to: "/properties", label: "Properties", icon: Building2 },
      { to: "/hmo", label: "HMO & rooms", icon: BedDouble },
      { to: "/listings", label: "Listings", icon: Tag },
    ],
  },
  {
    label: "Tenancy ops",
    defaultOpen: true,
    items: [
      { to: "/tenancies", label: "Tenancies", icon: Home },
      { to: "/tenants", label: "Tenants", icon: Users },
      { to: "/leads", label: "Enquiries", icon: Inbox },
      { to: "/work-orders", label: "Work orders", icon: Wrench },
      { to: "/contractor-marketplace", label: "Find a contractor", icon: Hammer },
      { to: "/inspections", label: "Inspections", icon: ClipboardList },
      { to: "/renewals", label: "Renewals", icon: RefreshCcw },
      { to: "/arrears", label: "Arrears", icon: Banknote },
    ],
  },
  {
    label: "Compliance & money",
    items: [
      { to: "/compliance", label: "Compliance", icon: ShieldCheck },
      { to: "/deposits", label: "Deposits", icon: Vault },
      { to: "/statements", label: "Statements", icon: Receipt },
      { to: "/banking", label: "Bank reconciliation", icon: Landmark },
      { to: "/documents", label: "Documents", icon: FolderLock },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/contacts", label: "Contacts", icon: Contact },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ADMIN_PRIMARY: NavigationSection = {
  label: "Platform",
  defaultOpen: true,
  items: [
    { to: "/dashboard", label: "Admin dashboard", icon: LayoutDashboard },
    { to: "/agency", label: "Users & agencies", icon: Users },
    { to: "/branches", label: "Branches", icon: Building2 },
    { to: "/reports", label: "Platform reports", icon: BarChart3 },
    { to: "/compliance", label: "Compliance oversight", icon: ShieldCheck },
  ],
};

const ADMIN_PATHS = new Set(ADMIN_PRIMARY.items.map((item) => item.to));
const ADMIN: NavigationSection[] = [
  ADMIN_PRIMARY,
  ...FULL.slice(1)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !ADMIN_PATHS.has(item.to)),
    }))
    .filter((section) => section.items.length > 0),
];

export function navigationSectionsForRole(role: AppRole | null): NavigationSection[] {
  switch (role) {
    case "admin":
      return ADMIN;
    case "agent":
      return AGENT;
    case "landlord":
      return LANDLORD;
    case "tenant":
      return TENANT;
    case "contractor":
      return CONTRACTOR;
    case "conveyancer":
      return CONVEYANCER;
    case "buyer":
      return BUYER;
    case "inventory_clerk":
    case "utility_provider":
      return SIMPLE;
    default:
      return [];
  }
}

const MOBILE: Partial<Record<AppRole, NavigationItem[]>> = {
  admin: [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/agency", label: "Agency", icon: Users },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  ],
  agent: [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/leads", label: "Leads", icon: Inbox },
    { to: "/listings", label: "Listings", icon: Building2 },
    { to: "/pipeline", label: "Pipeline", icon: Gavel },
  ],
  landlord: [
    { to: "/portal/landlord", label: "Home", icon: LayoutDashboard },
    { to: "/properties", label: "Properties", icon: Building2 },
    { to: "/tenancies", label: "Tenancies", icon: Users },
    { to: "/work-orders", label: "Repairs", icon: Wrench },
  ],
  tenant: [
    { to: "/portal/tenant", label: "Home", icon: LayoutDashboard },
    { to: "/work-orders", label: "Repairs", icon: Wrench },
    { to: "/documents", label: "Docs", icon: FileText },
    { to: "/inbox", label: "Messages", icon: Inbox },
  ],
  contractor: [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/work-orders", label: "Jobs", icon: Wrench },
    { to: "/contractor-marketplace", label: "Bid", icon: Hammer },
    { to: "/evidence", label: "Evidence", icon: Camera },
  ],
  buyer: [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/marketplace", label: "Browse", icon: Search },
    { to: "/saved-searches", label: "Saved", icon: Heart },
    { to: "/vendor-portal", label: "Progress", icon: Gavel },
  ],
  conveyancer: [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/sales", label: "Matters", icon: Gavel },
    { to: "/documents", label: "Docs", icon: FileText },
    { to: "/inbox", label: "Messages", icon: Inbox },
  ],
  inventory_clerk: [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/work-orders", label: "Tasks", icon: Wrench },
    { to: "/evidence", label: "Evidence", icon: ShieldCheck },
    { to: "/inbox", label: "Messages", icon: Inbox },
  ],
  utility_provider: [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/work-orders", label: "Tasks", icon: Wrench },
    { to: "/evidence", label: "Evidence", icon: ShieldCheck },
    { to: "/inbox", label: "Messages", icon: Inbox },
  ],
};

export function mobileTabsForRole(role: AppRole | null): NavigationItem[] {
  return role ? (MOBILE[role] ?? []) : [];
}

const ACTIONS: Record<"property" | "listing" | "deal" | "contact", NavigationAction> = {
  property: {
    to: "/properties",
    label: "New property",
    description: "Add to portfolio",
    icon: Plus,
    search: { create: true },
  },
  listing: {
    to: "/listings",
    label: "New listing",
    description: "Publish to market",
    icon: Plus,
    search: { new: true },
  },
  deal: {
    to: "/pipeline",
    label: "New deal",
    description: "Track in pipeline",
    icon: Plus,
    search: { create: true },
  },
  contact: {
    to: "/contacts",
    label: "New contact",
    description: "Landlord, tenant, supplier",
    icon: Plus,
    search: { create: true },
  },
};

export function commandActionsForRole(role: AppRole | null): NavigationAction[] {
  if (role === "admin" || role === "agent") return Object.values(ACTIONS);
  if (role === "landlord") return [ACTIONS.property, ACTIONS.listing, ACTIONS.contact];
  return [];
}

export function commandNavigationForRole(role: AppRole | null): NavigationItem[] {
  const seen = new Set<string>();
  return navigationSectionsForRole(role)
    .flatMap((section) => section.items)
    .filter((item) => {
      if (seen.has(item.to)) return false;
      seen.add(item.to);
      return true;
    });
}

export function searchResourcesForRole(role: AppRole | null): SearchResource[] {
  switch (role) {
    case "admin":
    case "agent":
      return ["properties", "contacts", "listings", "leads", "workOrders"];
    case "landlord":
      return ["properties", "contacts", "listings", "leads", "workOrders"];
    case "tenant":
    case "contractor":
    case "inventory_clerk":
    case "utility_provider":
      return ["workOrders"];
    case "buyer":
      return ["listings", "leads"];
    default:
      return [];
  }
}
