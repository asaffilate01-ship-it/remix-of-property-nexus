import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hammer, Star, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/contractor-marketplace")({
  head: () => ({ meta: [{ title: "Find a contractor — Estately" }] }),
  component: ContractorMarketplacePage,
});

const TRADES = ["plumber","electrician","gas_engineer","builder","roofer","painter","handyman","cleaner","gardener","locksmith"];

type Contact = { id: string; contact_type: string; full_name: string; company_name: string | null; email: string | null; phone: string | null; hourly_rate: number | null; rating: number | null; is_preferred: boolean; city: string | null; postcode: string | null };

function ContractorMarketplacePage() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [trade, setTrade] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, contact_type, full_name, company_name, email, phone, hourly_rate, rating, is_preferred, postcode")
        .in("contact_type", TRADES)
        .eq("is_active", true)
        .order("is_preferred", { ascending: false }).order("rating", { ascending: false, nullsFirst: false });
      setRows(((data as any) ?? []).map((r: any) => ({ ...r, city: null }))); setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    (trade === "all" || r.contact_type === trade) &&
    (!q || r.full_name.toLowerCase().includes(q.toLowerCase()) || (r.company_name ?? "").toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, trade]);

  return (
    <div className="space-y-6">
      <PageHeader title="Find a contractor" description="Trusted trades from your contacts directory." actions={
        <Button asChild><Link to="/contacts">Manage contractors</Link></Button>
      } />

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <div className="flex flex-wrap gap-1">
          <Button variant={trade === "all" ? "default" : "outline"} size="sm" onClick={() => setTrade("all")}>All</Button>
          {TRADES.map((t) => (
            <Button key={t} variant={trade === t ? "default" : "outline"} size="sm" onClick={() => setTrade(t)}>{t.replaceAll("_"," ")}</Button>
          ))}
        </div>
      </div>

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Hammer className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>{rows.length === 0 ? "No contractors in your directory yet." : "No matches."}</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1.5">{c.full_name} {c.is_preferred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</div>
                    {c.company_name && <div className="text-xs text-muted-foreground truncate">{c.company_name}</div>}
                  </div>
                  <Badge variant="outline" className="capitalize">{c.contact_type.replaceAll("_"," ")}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {c.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</div>}
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t">
                  {c.hourly_rate ? <span className="font-medium">£{c.hourly_rate}/hr</span> : <span className="text-muted-foreground">No rate</span>}
                  {c.rating ? <span>{"★".repeat(c.rating)}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
