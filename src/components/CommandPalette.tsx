import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useRecentRoutes } from "@/hooks/useRecentRoutes";
import {
  Home, Building2, Users, FileText, Banknote, ClipboardList,
  CalendarClock, Wrench, Shield, Mail, Settings, Plus, ArrowRight,
  Clock,
} from "lucide-react";

type Hit = {
  id: string;
  label: string;
  sub?: string;
  to: string;
  params?: Record<string, string>;
  icon: typeof Home;
};

const NAV: Hit[] = [
  { id: "n-dash", label: "Dashboard", to: "/dashboard", icon: Home },
  { id: "n-prop", label: "Properties", to: "/properties", icon: Building2 },
  { id: "n-list", label: "Listings", to: "/listings", icon: FileText },
  { id: "n-leads", label: "Leads", to: "/leads", icon: Mail },
  { id: "n-view", label: "Viewings", to: "/viewings", icon: CalendarClock },
  { id: "n-pipe", label: "Pipeline", to: "/pipeline", icon: ClipboardList },
  { id: "n-ten", label: "Tenancies", to: "/tenancies", icon: Users },
  { id: "n-arr", label: "Arrears", to: "/arrears", icon: Banknote },
  { id: "n-ren", label: "Renewals", to: "/renewals", icon: CalendarClock },
  { id: "n-work", label: "Work orders", to: "/work-orders", icon: Wrench },
  { id: "n-comp", label: "Compliance", to: "/compliance", icon: Shield },
  { id: "n-doc", label: "Documents", to: "/documents", icon: FileText },
  { id: "n-con", label: "Contacts", to: "/contacts", icon: Users },
  { id: "n-set", label: "Settings", to: "/settings", icon: Settings },
];

const ACTIONS: Hit[] = [
  { id: "a-prop", label: "New property", sub: "Add to portfolio", to: "/properties", icon: Plus },
  { id: "a-list", label: "New listing", sub: "Publish to market", to: "/listings", icon: Plus },
  { id: "a-deal", label: "New deal", sub: "Track in pipeline", to: "/pipeline", icon: Plus },
  { id: "a-con", label: "New contact", sub: "Landlord, tenant, supplier", to: "/contacts", icon: Plus },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const navigate = useNavigate();
  const { items: recent } = useRecentRoutes();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    const openHandler = () => setOpen(true);
    window.addEventListener("open-command-palette", openHandler);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", openHandler);
    };
  }, []);

  const search = useCallback(async (term: string) => {
    if (!term || term.length < 2) { setHits([]); return; }
    const like = `%${term}%`;
    const [props, contacts, listings, leads, workOrders, tenancies] = await Promise.all([
      supabase.from("properties").select("id,title,address,city").or(`title.ilike.${like},address.ilike.${like},city.ilike.${like}`).limit(4),
      supabase.from("contacts").select("id,full_name,email").or(`full_name.ilike.${like},email.ilike.${like}`).limit(4),
      supabase.from("listings").select("id,slug,title,city").or(`title.ilike.${like},city.ilike.${like}`).limit(4),
      supabase.from("leads").select("id,name,email,status").or(`name.ilike.${like},email.ilike.${like}`).limit(4),
      supabase.from("work_orders").select("id,title,status").ilike("title", like).limit(4),
      supabase.from("tenancies").select("id,property_id").limit(0), // placeholder; tenancies have no name field
    ]);
    void tenancies;
    const out: Hit[] = [];
    (props.data ?? []).forEach((r) =>
      out.push({ id: "p" + r.id, label: r.title ?? r.address ?? "Property", sub: r.city ?? "Property", to: "/properties", icon: Building2 }));
    (listings.data ?? []).forEach((r) =>
      out.push({
        id: "l" + r.id,
        label: r.title ?? "Listing",
        sub: r.city ?? "Listing",
        to: "/marketplace/$slug",
        params: { slug: r.slug },
        icon: FileText,
      }));
    (leads.data ?? []).forEach((r) =>
      out.push({
        id: "ld" + r.id,
        label: r.name,
        sub: (r.status ?? "lead").replace(/_/g, " "),
        to: "/leads/$id",
        params: { id: r.id },
        icon: Mail,
      }));
    (workOrders.data ?? []).forEach((r) =>
      out.push({
        id: "wo" + r.id,
        label: r.title,
        sub: (r.status ?? "open").replace(/_/g, " "),
        to: "/work-orders/$id",
        params: { id: r.id },
        icon: Wrench,
      }));
    (contacts.data ?? []).forEach((r) =>
      out.push({ id: "c" + r.id, label: r.full_name ?? r.email ?? "Contact", sub: r.email ?? "Contact", to: "/contacts", icon: Users }));
    setHits(out);
  }, []);

  useEffect(() => {
    const h = setTimeout(() => search(q), 200);
    return () => clearTimeout(h);
  }, [q, search]);

  const go = (h: Hit) => {
    setOpen(false); setQ("");
    if (h.params) navigate({ to: h.to, params: h.params } as never);
    else navigate({ to: h.to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search properties, listings, leads, work orders, contacts…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{q.length < 2 ? "Start typing to search…" : "No results."}</CommandEmpty>
        {q.length < 2 && recent.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recent.map((r) => (
                <CommandItem key={r.to} onSelect={() => { setOpen(false); navigate({ to: r.to } as never); }}>
                  <Clock className="h-4 w-4 mr-2 opacity-60" />
                  <span className="flex-1 capitalize">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.to}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {hits.length > 0 && (
          <CommandGroup heading="Records">
            {hits.map((h) => {
              const Icon = h.icon;
              return (
                <CommandItem key={h.id} onSelect={() => go(h)}>
                  <Icon className="h-4 w-4 mr-2 opacity-60" />
                  <span className="flex-1">{h.label}</span>
                  {h.sub && <span className="text-xs text-muted-foreground capitalize">{h.sub}</span>}
                  <ArrowRight className="h-3 w-3 ml-2 opacity-40" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <CommandItem key={a.id} onSelect={() => go(a)}>
                <Icon className="h-4 w-4 mr-2 opacity-60" />
                <span className="flex-1">{a.label}</span>
                {a.sub && <span className="text-xs text-muted-foreground">{a.sub}</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem key={n.id} onSelect={() => go(n)}>
                <Icon className="h-4 w-4 mr-2 opacity-60" />
                {n.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
