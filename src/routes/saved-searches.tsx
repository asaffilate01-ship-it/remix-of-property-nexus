import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2, Search, BellRing, Mail, Smartphone, MapPin, Cloud } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/use-auth";
import { listSavedSearches, updateSavedSearch, deleteSavedSearch, saveSearch as saveSearchFn } from "@/lib/saved-searches.functions";

export const Route = createFileRoute("/saved-searches")({
  head: () => ({ meta: [{ title: "Saved searches & alerts | Estately" }, { name: "description", content: "Manage your saved property searches and get instant email or push alerts when new homes match." }] }),
  component: SavedSearchesPage,
});

type LocalSaved = { when: string; search: Record<string, unknown>; q?: string; city?: string; id?: string; alert?: { email: boolean; push: boolean; frequency: "instant" | "daily" | "weekly" } };
type RemoteSaved = {
  id: string;
  name: string | null;
  criteria: Record<string, unknown>;
  alert_email: boolean;
  alert_push: boolean;
  frequency: "instant" | "daily" | "weekly";
  created_at: string;
};

function SavedSearchesPage() {
  const { user, loading } = useAuth();
  const fetchList = useServerFn(listSavedSearches);
  const update = useServerFn(updateSavedSearch);
  const remove = useServerFn(deleteSavedSearch);
  const save = useServerFn(saveSearchFn);

  const [remote, setRemote] = useState<RemoteSaved[]>([]);
  const [local, setLocal] = useState<LocalSaved[]>([]);
  const [busy, setBusy] = useState(false);

  // Load local fallback always (so signed-out users see history)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("estately:saved-searches") ?? "[]") as LocalSaved[];
      setLocal(raw.map((r, i) => ({ ...r, id: r.id ?? String(i), alert: r.alert ?? { email: true, push: false, frequency: "daily" } })));
    } catch { /* noop */ }
  }, []);

  // Load remote when signed in
  useEffect(() => {
    if (!user) return;
    fetchList({}).then((r) => setRemote(r.items as RemoteSaved[])).catch(() => {});
  }, [user, fetchList]);

  // One-time migration: push local entries into DB
  const migrateLocal = async () => {
    if (!user || local.length === 0) return;
    setBusy(true);
    try {
      for (const it of local) {
        await save({ data: {
          name: it.q || it.city || "Imported search",
          criteria: it.search ?? {},
          alert_email: it.alert?.email ?? true,
          alert_push: it.alert?.push ?? false,
          frequency: it.alert?.frequency ?? "daily",
        } });
      }
      localStorage.removeItem("estately:saved-searches");
      setLocal([]);
      const r = await fetchList({});
      setRemote(r.items as RemoteSaved[]);
      toast.success(`Synced ${local.length} search${local.length === 1 ? "" : "es"} to your account`);
    } catch {
      toast.error("Couldn't sync");
    } finally { setBusy(false); }
  };

  const updateRemote = async (id: string, patch: Partial<Pick<RemoteSaved, "alert_email" | "alert_push" | "frequency">>) => {
    setRemote((curr) => curr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    try { await update({ data: { id, ...patch } }); } catch { toast.error("Save failed"); }
  };
  const removeRemote = async (id: string) => {
    setRemote((curr) => curr.filter((it) => it.id !== id));
    try { await remove({ data: { id } }); toast.success("Removed"); } catch { toast.error("Delete failed"); }
  };

  const updateLocal = (id: string, patch: Partial<NonNullable<LocalSaved["alert"]>>) => {
    const next = local.map((i) => i.id === id ? { ...i, alert: { ...(i.alert ?? { email: true, push: false, frequency: "daily" }), ...patch } } : i);
    setLocal(next);
    localStorage.setItem("estately:saved-searches", JSON.stringify(next));
  };
  const removeLocal = (id: string) => {
    const next = local.filter((i) => i.id !== id);
    setLocal(next);
    localStorage.setItem("estately:saved-searches", JSON.stringify(next));
    toast.success("Removed");
  };

  const items = user ? remote : local;
  const empty = !loading && items.length === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient">
          <div className="container mx-auto px-4 py-10 md:py-14 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur mb-3"><BellRing className="h-3 w-3" /> Never miss a match</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Saved searches & alerts</h1>
            <p className="text-white/85 mt-2 max-w-2xl">Re-run a search in one tap, and get email or push alerts the moment new listings match your criteria.</p>
            {!user && !loading && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm backdrop-blur">
                <Cloud className="h-4 w-4" /> Sign in to sync your searches across devices and get email alerts.
                <Button asChild size="sm" variant="secondary" className="ml-2"><Link to="/auth">Sign in</Link></Button>
              </div>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-10">
          {user && local.length > 0 && (
            <Card className="mb-4 border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="text-sm">You have {local.length} search{local.length === 1 ? "" : "es"} saved on this device. Sync them to your account?</div>
                <Button size="sm" onClick={migrateLocal} disabled={busy}>{busy ? "Syncing…" : "Sync now"}</Button>
              </CardContent>
            </Card>
          )}

          {empty ? (
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
              {user
                ? remote.map((it) => (
                    <SavedCard
                      key={it.id}
                      title={it.name || labelFor(it.criteria) || "All listings"}
                      chips={chipsFor(it.criteria)}
                      criteria={it.criteria}
                      when={it.created_at}
                      email={it.alert_email}
                      push={it.alert_push}
                      frequency={it.frequency}
                      onUpdate={(p) => updateRemote(it.id, p)}
                      onRemove={() => removeRemote(it.id)}
                    />
                  ))
                : local.map((it) => (
                    <SavedCard
                      key={it.id}
                      title={it.q || it.city || "All listings"}
                      chips={chipsFor((it.search ?? {}) as Record<string, unknown>)}
                      criteria={(it.search ?? {}) as Record<string, unknown>}
                      when={it.when}
                      email={it.alert?.email ?? true}
                      push={it.alert?.push ?? false}
                      frequency={it.alert?.frequency ?? "daily"}
                      onUpdate={(p) => updateLocal(it.id!, { email: p.alert_email, push: p.alert_push, frequency: p.frequency })}
                      onRemove={() => removeLocal(it.id!)}
                    />
                  ))}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function SavedCard(props: {
  title: string;
  chips: string[];
  criteria: Record<string, unknown>;
  when: string;
  email: boolean;
  push: boolean;
  frequency: "instant" | "daily" | "weekly";
  onUpdate: (p: { alert_email?: boolean; alert_push?: boolean; frequency?: "instant" | "daily" | "weekly" }) => void;
  onRemove: () => void;
}) {
  const { title, chips, criteria, when, email, push, frequency, onUpdate, onRemove } = props;
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-semibold truncate">{title}</span>
              {(criteria.city as string) && <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{String(criteria.city)}</span>}
            </div>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c, i) => <Badge key={i} variant="secondary" className="capitalize text-[11px]">{c}</Badge>)}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-2">Saved {new Date(when).toLocaleDateString()}</div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button asChild size="sm" variant="outline"><Link to="/marketplace" search={criteria as never}>Re-run</Link></Button>
            <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="mt-4 border-t pt-4 grid sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-between rounded-md border p-2.5 cursor-pointer">
            <span className="inline-flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> Email</span>
            <Switch checked={email} onCheckedChange={(v) => onUpdate({ alert_email: v })} />
          </label>
          <label className="flex items-center justify-between rounded-md border p-2.5 cursor-pointer">
            <span className="inline-flex items-center gap-2 text-sm"><Smartphone className="h-4 w-4 text-muted-foreground" /> Push</span>
            <Switch checked={push} onCheckedChange={(v) => onUpdate({ alert_push: v })} />
          </label>
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <span className="inline-flex items-center gap-2 text-sm"><Bell className="h-4 w-4 text-muted-foreground" /> Frequency</span>
            <select
              value={frequency}
              onChange={(e) => onUpdate({ frequency: e.target.value as "instant" | "daily" | "weekly" })}
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
}

function chipsFor(s: Record<string, unknown>): string[] {
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
function labelFor(s: Record<string, unknown>): string {
  return (s.q as string) || (s.city as string) || "";
}
