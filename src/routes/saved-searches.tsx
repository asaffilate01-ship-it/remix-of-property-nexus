import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2, Search, BellRing, Mail, Smartphone, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/saved-searches")({
  head: () => ({ meta: [{ title: "Saved searches & alerts | Estately" }, { name: "description", content: "Manage your saved property searches and get instant email or push alerts when new homes match." }] }),
  component: SavedSearchesPage,
});

type Saved = { when: string; search: Record<string, unknown>; q?: string; city?: string; id?: string; alert?: { email: boolean; push: boolean; frequency: "instant" | "daily" | "weekly" } };

function SavedSearchesPage() {
  const [items, setItems] = useState<Saved[]>([]);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("estately:saved-searches") ?? "[]") as Saved[];
      setItems(raw.map((r, i) => ({ ...r, id: r.id ?? String(i), alert: r.alert ?? { email: true, push: false, frequency: "daily" } })));
    } catch { /* noop */ }
  }, []);

  const persist = (next: Saved[]) => {
    setItems(next);
    localStorage.setItem("estately:saved-searches", JSON.stringify(next));
  };
  const remove = (id: string) => { persist(items.filter((i) => i.id !== id)); toast.success("Removed"); };
  const updateAlert = (id: string, patch: Partial<NonNullable<Saved["alert"]>>) => {
    persist(items.map((i) => i.id === id ? { ...i, alert: { ...(i.alert ?? { email: true, push: false, frequency: "daily" }), ...patch } } : i));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient">
          <div className="container mx-auto px-4 py-10 md:py-14 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur mb-3"><BellRing className="h-3 w-3" /> Never miss a match</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Saved searches & alerts</h1>
            <p className="text-white/85 mt-2 max-w-2xl">Re-run a search in one tap, and get email or push alerts the moment new listings match your criteria.</p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-10">
          {items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3"><Search className="h-6 w-6 text-muted-foreground" /></div>
                <p className="font-medium">No saved searches yet</p>
                <p className="text-sm text-muted-foreground mt-1">Browse the marketplace, tweak filters, then tap <span className="font-medium">Save</span> to start.</p>
                <Button asChild className="mt-4"><Link to="/marketplace">Go to marketplace</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {items.map((it) => {
                const chips = chipsFor(it);
                return (
                  <Card key={it.id} className="border-0 shadow-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {it.q && <span className="font-semibold truncate">"{it.q}"</span>}
                            {it.city && <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{it.city}</span>}
                            {!it.q && !it.city && <span className="font-semibold">All listings</span>}
                          </div>
                          {chips.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {chips.map((c, i) => <Badge key={i} variant="secondary" className="capitalize text-[11px]">{c}</Badge>)}
                            </div>
                          )}
                          <div className="text-[11px] text-muted-foreground mt-2">Saved {new Date(it.when).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button asChild size="sm" variant="outline"><Link to="/marketplace" search={(it.search ?? {}) as never}>Re-run</Link></Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(it.id!)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>

                      <div className="mt-4 border-t pt-4 grid sm:grid-cols-3 gap-3">
                        <label className="flex items-center justify-between rounded-md border p-2.5 cursor-pointer">
                          <span className="inline-flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> Email</span>
                          <Switch checked={it.alert?.email ?? true} onCheckedChange={(v) => updateAlert(it.id!, { email: v })} />
                        </label>
                        <label className="flex items-center justify-between rounded-md border p-2.5 cursor-pointer">
                          <span className="inline-flex items-center gap-2 text-sm"><Smartphone className="h-4 w-4 text-muted-foreground" /> Push</span>
                          <Switch checked={it.alert?.push ?? false} onCheckedChange={(v) => updateAlert(it.id!, { push: v })} />
                        </label>
                        <div className="flex items-center justify-between rounded-md border p-2.5">
                          <span className="inline-flex items-center gap-2 text-sm"><Bell className="h-4 w-4 text-muted-foreground" /> Frequency</span>
                          <select
                            value={it.alert?.frequency ?? "daily"}
                            onChange={(e) => updateAlert(it.id!, { frequency: e.target.value as "instant" | "daily" | "weekly" })}
                            className="text-sm bg-transparent outline-none"
                          >
                            <option value="instant">Instant</option>
                            <option value="daily">Daily digest</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function chipsFor(it: Saved): string[] {
  const s = (it.search ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  if (s.category && s.category !== "all") out.push(String(s.category));
  if (s.min_price) out.push(`from £${Number(s.min_price).toLocaleString()}`);
  if (s.max_price) out.push(`to £${Number(s.max_price).toLocaleString()}`);
  if (s.beds) out.push(`${s.beds}+ beds`);
  if (s.baths) out.push(`${s.baths}+ baths`);
  if (s.bills_included) out.push("bills included");
  if (s.furnished) out.push(String(s.furnished));
  return out;
}
