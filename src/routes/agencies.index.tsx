import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { fetchAgencies } from "@/lib/public.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Star, MapPin, Search, Building2 } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/agencies/")({
  head: () => ({
    meta: [
      { title: "Find a property agent — verified UK agents & agencies | Estately" },
      { name: "description", content: "Browse verified letting and sales agencies on Estately. Filter by city, rating and specialty." },
      { property: "og:title", content: "Find a property agent on Estately" },
      { property: "og:description", content: "Verified UK letting and sales agents with live listing counts and reviews." },
    ],
  }),
  component: AgenciesPage,
});

function AgenciesPage() {
  const fn = useServerFn(fetchAgencies);
  const { data, isLoading } = useQuery({ queryKey: ["agencies"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);

  const filtered = useMemo(() => {
    const list = data?.agencies ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((a) => {
      if (onlyVerified && !a.verified) return false;
      if (!needle) return true;
      return (
        a.name.toLowerCase().includes(needle) ||
        (a.city ?? "").toLowerCase().includes(needle) ||
        (a.specialties ?? []).some((s: string) => s.toLowerCase().includes(needle))
      );
    });
  }, [data, q, onlyVerified]);

  const verifiedCount = (data?.agencies ?? []).filter((a) => a.verified).length;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient text-white">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Find a verified agent</h1>
            <p className="mt-3 text-white/85 max-w-2xl">
              Browse {data?.agencies.length ?? "—"} UK letting and sales agencies, including {verifiedCount} verified by Estately.
            </p>
            <div className="mt-6 max-w-xl bg-card rounded-2xl p-2 shadow-elevated flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground ml-2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by agency, city or specialty"
                className="border-0 focus-visible:ring-0 shadow-none text-foreground"
              />
              <button
                onClick={() => setOnlyVerified((v) => !v)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${onlyVerified ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-transparent"}`}
              >
                Verified only
              </button>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-muted rounded" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No agencies match your search.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => (
                <Link key={a.id} to="/agencies/$slug" params={{ slug: a.slug }}>
                  <Card className="border-0 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all h-full">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden brand-gradient flex items-center justify-center text-white font-bold shrink-0">
                          {a.logo_url ? <img src={a.logo_url} alt="" className="h-full w-full object-cover" /> : a.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="font-semibold truncate">{a.name}</div>
                            {a.verified && <VerifiedBadge kind="agency" compact />}
                          </div>
                          {a.city && (
                            <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />{a.city}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            {a.rating != null && (
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Star className="h-3 w-3 fill-warning text-warning" />
                                {Number(a.rating).toFixed(1)}
                                <span className="text-muted-foreground font-normal">({a.review_count ?? 0})</span>
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              {a.listing_count} {a.listing_count === 1 ? "listing" : "listings"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {a.specialties && a.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {a.specialties.slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[10px] capitalize">{s}</Badge>
                          ))}
                        </div>
                      )}
                      {a.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
