import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/commercial")({
  head: () => ({ meta: [{ title: "Commercial — Gabley" }] }),
  component: CommercialPage,
});

const COMMERCIAL_TYPES = ["office","retail","industrial","warehouse","mixed-use","hospitality","healthcare","leisure"];

type Listing = { id: string; title: string | null; address: string | null; city: string | null; postcode: string | null; property_type_code: string | null; floor_area_sqft: number | null; price: number | null };

function CommercialPage() {
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, address, city, postcode, property_type_code, floor_area_sqft, price")
        .in("property_type_code", COMMERCIAL_TYPES);
      setRows((data as any) ?? []); setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Commercial" description="Offices, retail, industrial and other commercial listings." />

      {loading ? <Card className="animate-pulse"><CardContent className="h-32" /></Card> :
       rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Briefcase className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>No commercial listings yet. Create a listing with a commercial property type.</div></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <Card key={p.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-2">
                <Link to="/listings" className="font-semibold hover:underline truncate block">{p.title || [p.address, p.city].filter(Boolean).join(", ")}</Link>
                <div className="text-xs text-muted-foreground">{p.postcode}</div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {p.property_type_code && <Badge variant="outline" className="capitalize">{p.property_type_code.replace("-"," ")}</Badge>}
                  {p.floor_area_sqft ? <Badge variant="secondary" className="font-normal">{p.floor_area_sqft.toLocaleString()} sqft</Badge> : null}
                </div>
                {p.price ? <div className="text-lg font-bold">£{Number(p.price).toLocaleString()}</div> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
