import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Clock, FileText, Mail, SearchX, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { useLocale } from "@/hooks/useLocale";
import { useRecentRoutes } from "@/hooks/useRecentRoutes";
import { useUserRole } from "@/hooks/useUserRole";
import { translateUi } from "@/lib/locale";
import {
  commandActionsForRole,
  commandNavigationForRole,
  searchResourcesForRole,
} from "@/lib/navigation";

type Hit = {
  id: string;
  label: string;
  description?: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, boolean>;
  icon: LucideIcon;
};

function safeSearchTerm(value: string): string {
  return value
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searchError, setSearchError] = useState(false);
  const searchSequence = useRef(0);
  const navigate = useNavigate();
  const { items: recent } = useRecentRoutes();
  const { role, loading: roleLoading } = useUserRole();
  const { locale } = useLocale();

  const navigation = useMemo(() => commandNavigationForRole(role), [role]);
  const actions = useMemo(() => commandActionsForRole(role), [role]);
  const resources = useMemo(() => new Set(searchResourcesForRole(role)), [role]);
  const authorisedPaths = useMemo(() => new Set(navigation.map((item) => item.to)), [navigation]);
  const authorisedRecent = recent.filter((item) =>
    [...authorisedPaths].some((path) => item.to === path || item.to.startsWith(`${path}/`)),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", openHandler);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", openHandler);
    };
  }, []);

  const search = useCallback(
    async (rawTerm: string) => {
      const sequence = ++searchSequence.current;
      const term = safeSearchTerm(rawTerm);
      setSearchError(false);
      if (!role || term.length < 2 || resources.size === 0) {
        setHits([]);
        return;
      }

      const pattern = `%${term}%`;
      const searches: PromiseLike<Hit[]>[] = [];

      if (resources.has("properties")) {
        searches.push(
          supabase
            .from("properties")
            .select("id,title,address,city")
            .ilike("title", pattern)
            .limit(4)
            .then(({ data, error }): Hit[] => {
              if (error) throw error;
              return (data ?? []).map((row) => ({
                id: `property-${row.id}`,
                label: row.title ?? row.address ?? "Property",
                description: row.city ?? "Property",
                to: "/properties",
                icon: Building2,
              }));
            }),
        );
      }

      if (resources.has("contacts")) {
        searches.push(
          supabase
            .from("contacts")
            .select("id,full_name,email")
            .ilike("full_name", pattern)
            .limit(4)
            .then(({ data, error }): Hit[] => {
              if (error) throw error;
              return (data ?? []).map((row) => ({
                id: `contact-${row.id}`,
                label: row.full_name ?? row.email ?? "Contact",
                description: row.email ?? "Contact",
                to: "/contacts",
                icon: Users,
              }));
            }),
        );
      }

      if (resources.has("listings")) {
        searches.push(
          supabase
            .from("listings")
            .select("id,slug,title,city")
            .ilike("title", pattern)
            .limit(4)
            .then(({ data, error }): Hit[] => {
              if (error) throw error;
              return (data ?? []).map((row) => ({
                id: `listing-${row.id}`,
                label: row.title ?? "Listing",
                description: row.city ?? "Listing",
                to: "/marketplace/$slug",
                params: { slug: row.slug },
                icon: FileText,
              }));
            }),
        );
      }

      if (resources.has("leads")) {
        searches.push(
          supabase
            .from("leads")
            .select("id,name,status")
            .ilike("name", pattern)
            .limit(4)
            .then(({ data, error }): Hit[] => {
              if (error) throw error;
              return (data ?? []).map((row) => ({
                id: `lead-${row.id}`,
                label: row.name,
                description: (row.status ?? "lead").replace(/_/g, " "),
                to: "/leads/$id",
                params: { id: row.id },
                icon: Mail,
              }));
            }),
        );
      }

      if (resources.has("workOrders")) {
        searches.push(
          supabase
            .from("work_orders")
            .select("id,title,status")
            .ilike("title", pattern)
            .limit(4)
            .then(({ data, error }): Hit[] => {
              if (error) throw error;
              return (data ?? []).map((row) => ({
                id: `work-order-${row.id}`,
                label: row.title,
                description: (row.status ?? "open").replace(/_/g, " "),
                to: "/work-orders/$id",
                params: { id: row.id },
                icon: Wrench,
              }));
            }),
        );
      }

      try {
        const resultGroups = await Promise.all(searches);
        if (sequence !== searchSequence.current) return;
        setHits(resultGroups.flat());
      } catch {
        if (sequence !== searchSequence.current) return;
        setHits([]);
        setSearchError(true);
      }
    },
    [resources, role],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void search(query), 250);
    return () => window.clearTimeout(timeout);
  }, [query, search]);

  useEffect(() => {
    setHits([]);
    setQuery("");
  }, [role]);

  const go = async (hit: Hit) => {
    setOpen(false);
    setQuery("");
    await navigate({
      to: hit.to,
      params: hit.params,
      search: hit.search,
    } as never);
  };

  const emptyMessage = roleLoading
    ? "Loading your authorised actions…"
    : searchError
      ? "Search is temporarily unavailable. Navigation still works below."
      : query.length < 2
        ? "Start typing to search…"
        : "No authorised results found.";

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search your workspace…"
        value={query}
        onValueChange={setQuery}
        aria-label="Search authorised workspace records and navigation"
      />
      <CommandList>
        <CommandEmpty>
          <span className="inline-flex items-center gap-2">
            {searchError && <SearchX className="h-4 w-4" aria-hidden="true" />}
            {emptyMessage}
          </span>
        </CommandEmpty>

        {query.length < 2 && authorisedRecent.length > 0 && (
          <>
            <CommandGroup heading={translateUi(locale, "Recent")}>
              {authorisedRecent.slice(0, 6).map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() =>
                    void go({
                      id: `recent-${item.to}`,
                      label: item.label,
                      to: item.to,
                      icon: Clock,
                    })
                  }
                >
                  <Clock className="mr-2 h-4 w-4 opacity-60" aria-hidden="true" />
                  <span className="flex-1 capitalize">{translateUi(locale, item.label)}</span>
                  <span className="text-xs text-muted-foreground">{item.to}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {hits.length > 0 && (
          <CommandGroup heading="Records">
            {hits.map((hit) => (
              <CommandItem key={hit.id} onSelect={() => void go(hit)}>
                <hit.icon className="mr-2 h-4 w-4 opacity-60" aria-hidden="true" />
                <span className="flex-1">{hit.label}</span>
                {hit.description && (
                  <span className="text-xs capitalize text-muted-foreground">
                    {hit.description}
                  </span>
                )}
                <ArrowRight className="ml-2 h-3 w-3 opacity-40" aria-hidden="true" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {actions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              {actions.map((action) => (
                <CommandItem
                  key={`${action.to}-${action.label}`}
                  onSelect={() =>
                    void go({
                      id: `action-${action.label}`,
                      label: action.label,
                      description: action.description,
                      to: action.to,
                      search: action.search,
                      icon: action.icon,
                    })
                  }
                >
                  <action.icon className="mr-2 h-4 w-4 opacity-60" aria-hidden="true" />
                  <span className="flex-1">{translateUi(locale, action.label)}</span>
                  <span className="text-xs text-muted-foreground">
                    {translateUi(locale, action.description)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {navigation.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navigate">
              {navigation.map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() =>
                    void go({
                      id: `navigation-${item.to}`,
                      label: item.label,
                      to: item.to,
                      icon: item.icon,
                    })
                  }
                >
                  <item.icon className="mr-2 h-4 w-4 opacity-60" aria-hidden="true" />
                  {translateUi(locale, item.label)}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
