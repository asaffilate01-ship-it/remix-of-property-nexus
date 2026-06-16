import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/saved-searches")({
  head: () => ({ meta: [{ title: "Saved searches — Estately" }] }),
  component: SavedSearchesPage,
});

type Search = {
  id: string;
  name: string | null;
  criteria: Record<string, unknown> | null;
  frequency: string | null;
  alert_email: boolean | null;
  last_notified_at: string | null;
};

type Match = {
  saved_search_id: string;
  listing_id: string;
  notified_at: string;
  listings: { id: string; slug: string | null; title: string | null; price: number | null; city: string | null } | null;
};

function SavedSearchesPage() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setLoading(false);
      const { data: s } = await supabase.from("saved_searches").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false });
      const ids = (s ?? []).map((x) => x.id);
      let m: Match[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("saved_search_matches")
          .select("saved_search_id, listing_id, notified_at, listings(id, slug, title, price, city)")
          .in("saved_search_id", ids)
          .order("notified_at", { ascending: false })
          .limit(100);
        m = (data as any) ?? [];
      }
      setSearches((s as any) ?? []);
      setMatches(m);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Saved searches" description="Get notified when new listings match your criteria." />

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : searches.length === 0 ? (
        <Card className="border-0 shadow-card"><CardContent className="p-6 text-sm text-muted-foreground">No saved searches yet. Save one from the listings page to start receiving matches.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {searches.map((s) => {
            const ms = matches.filter((x) => x.saved_search_id === s.id);
            return (
              <Card key={s.id} className="border-0 shadow-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-semibold">{s.name ?? "Untitled search"}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{s.frequency ?? "instant"}</Badge>
                      <Badge variant={s.alert_email ? "default" : "outline"} className="text-xs gap-1">
                        {s.alert_email ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                        email
                      </Badge>
                    </div>
                  </div>
                  <pre className="text-xs text-muted-foreground bg-muted/40 rounded p-2 overflow-x-auto">{JSON.stringify(s.criteria ?? {}, null, 0)}</pre>
                  {ms.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No matches yet.</div>
                  ) : (
                    <div className="divide-y">
                      {ms.slice(0, 10).map((m) => (
                        <Link key={m.listing_id} to="/listing/$slug" params={{ slug: m.listings?.slug ?? m.listing_id }} className="flex items-center justify-between py-2 hover:bg-muted/30 px-2 -mx-2 rounded">
                          <div className="text-sm">
                            <div className="font-medium">{m.listings?.title ?? "Listing"}</div>
                            <div className="text-xs text-muted-foreground">{m.listings?.city ?? ""} · {new Date(m.notified_at).toLocaleDateString()}</div>
                          </div>
                          {m.listings?.price ? <div className="text-sm font-medium">£{Number(m.listings.price).toLocaleString()}</div> : null}
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
