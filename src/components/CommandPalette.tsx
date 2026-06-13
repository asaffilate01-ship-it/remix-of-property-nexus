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
import {
  Home, Building2, Users, FileText, Banknote, ClipboardList,
  CalendarClock, Wrench, Shield, Mail, Settings, Plus, ArrowRight,
} from "lucide-react";

type Hit = {
  id: string; label: string; sub?: string; to: string; params?: Record<string, string>;
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
    const [p, c, l, t] = await Promise.all([
      supabase.from("properties").select("id,address_line1,city").or(`address_line1.ilike.${like},city.ilike.${like}`).limit(5),
      supabase.from("contacts").select("id,full_name,email").or(`full_name.ilike.${like},email.ilike.${like}`).limit(5),
      supabase.from("listings").select("id,title,city").or(`title.ilike.${like},city.ilike.${like}`).limit(5),
      supabase.from("tenancies").select("id,property_id").ilike("id", like).limit(3),
    ]);
    const out: Hit[] = [];
    (p.data ?? []).forEach((r: { id: string; address_line1: string | null; city: string | null }) =>
      out.push({ id: "p" + r.id, label: r.address_line1 ?? "Property", sub: r.city ?? "Property", to: "/properties", icon: Building2 }));
    (l.data ?? []).forEach((r: { id: string; title: string | null; city: string | null }) =>
      out.push({ id: "l" + r.id, label: r.title ?? "Listing", sub: r.city ?? "Listing", to: "/listings", icon: FileText }));
    (c.data ?? []).forEach((r: { id: string; full_name: string | null; email: string | null }) =>
      out.push({ id: "c" + r.id, label: r.full_name ?? r.email ?? "Contact", sub: r.email ?? "Contact", to: "/contacts", icon: Users }));
    (t.data ?? []).forEach((r: { id: string }) =>
      out.push({ id: "t" + r.id, label: `Tenancy ${r.id.slice(0, 8)}`, to: "/tenancies/$id", params: { id: r.id }, icon: Users }));
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
      <CommandInput placeholder="Search properties, contacts, listings, tenancies…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{q.length < 2 ? "Start typing to search…" : "No results."}</CommandEmpty>
        {hits.length > 0 && (
          <CommandGroup heading="Records">
            {hits.map((h) => {
              const Icon = h.icon;
              return (
                <CommandItem key={h.id} onSelect={() => go(h)}>
                  <Icon className="h-4 w-4 mr-2 opacity-60" />
                  <span className="flex-1">{h.label}</span>
                  {h.sub && <span className="text-xs text-muted-foreground">{h.sub}</span>}
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
