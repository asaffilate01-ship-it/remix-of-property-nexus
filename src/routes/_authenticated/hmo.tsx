import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedDouble, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/hmo")({
  head: () => ({ meta: [{ title: "HMO & rooms — Estately" }] }),
  component: HmoPage,
});

type Property = { id: string; address: string | null; city: string | null; bedrooms: number | null; property_type: string | null };
type Room = { id: string; name: string; rent_pcm: number | null; status: string; en_suite: boolean | null; property_id: string };

function HmoPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("properties").select("id, address, city, bedrooms, property_type").eq("property_type", "hmo"),
        supabase.from("rooms").select("id, name, rent_pcm, status, en_suite, property_id"),
      ]);
      setProperties((p.data as any) ?? []);
      setRooms((r.data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const roomsByProperty = useMemo(() => {
    const m = new Map<string, Room[]>();
    for (const r of rooms) { const a = m.get(r.property_id) ?? []; a.push(r); m.set(r.property_id, a); }
    return m;
  }, [rooms]);

  return (
    <div className="space-y-6">
      <PageHeader title="HMO & rooms" description="Houses in Multiple Occupation with per-room rents and availability." actions={
        <Button asChild><Link to="/properties"><Plus className="mr-2 h-4 w-4" /> Add HMO</Link></Button>
      } />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       properties.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><BedDouble className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No HMO properties yet. Set a property's type to HMO.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => {
            const r = roomsByProperty.get(p.id) ?? [];
            const let_ = r.filter((x) => x.status === "let").length;
            const avail = r.filter((x) => x.status !== "let").length;
            const revenue = r.reduce((s, x) => s + Number(x.rent_pcm ?? 0), 0);
            return (
              <Card key={p.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="font-semibold truncate">{[p.address, p.city].filter(Boolean).join(", ")}</div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="secondary" className="font-normal">{r.length} rooms</Badge>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700">{let_} let</Badge>
                    <Badge variant="outline" className="border-amber-300 text-amber-700">{avail} available</Badge>
                  </div>
                  {revenue > 0 && <div className="text-sm">£{revenue.toLocaleString()}/mo potential</div>}
                  <div className="space-y-1 border-t pt-2">
                    {r.slice(0, 5).map((x) => (
                      <div key={x.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{x.name}{x.en_suite && " · ensuite"}</span>
                        <span className="text-muted-foreground">£{Number(x.rent_pcm ?? 0)} · {x.status}</span>
                      </div>
                    ))}
                    {r.length > 5 && <div className="text-xs text-muted-foreground">+{r.length - 5} more</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
