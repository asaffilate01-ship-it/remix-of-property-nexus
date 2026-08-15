import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useUserRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/_authenticated/vendor-portal")({
  head: () => ({ meta: [{ title: "Vendor portal — Estately" }] }),
  component: VendorPortalPage,
});

type Deal = {
  id: string;
  status: string;
  agreed_price: number | null;
  offer_amount: number | null;
  memo_of_sale_at: string | null;
  exchange_at: string | null;
  completion_at: string | null;
  properties: { address: string | null; city: string | null } | null;
};

function VendorPortalPage() {
  const { role } = useUserRole();
  const [rows, setRows] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sales_deals")
        .select(
          "id, status, agreed_price, offer_amount, memo_of_sale_at, exchange_at, completion_at, properties(address, city)",
        )
        .order("created_at", { ascending: false });
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const STEPS = [
    "memo_of_sale",
    "searches",
    "enquiries",
    "mortgage_offer",
    "exchange",
    "completion",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor portal"
        description="Track your sales — memo of sale through to completion."
        actions={
          role === "admin" || role === "agent" ? (
            <Link to="/sales" className="text-sm text-primary hover:underline">
              View all sales
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="h-32" />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Eye className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div>No sales in progress.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((d) => {
            const idx = STEPS.indexOf(d.status);
            return (
              <Card key={d.id} className="border-0 shadow-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {[d.properties?.address, d.properties?.city].filter(Boolean).join(", ") ||
                          "Property"}
                      </div>
                      {(d.agreed_price ?? d.offer_amount) && (
                        <div className="text-lg font-bold mt-1">
                          £{Number(d.agreed_price ?? d.offer_amount).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {d.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {STEPS.map((s, i) => (
                      <div
                        key={s}
                        className={`flex-1 h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`}
                        title={s.replaceAll("_", " ")}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground border-t pt-2">
                    <div>
                      Memo:{" "}
                      {d.memo_of_sale_at ? new Date(d.memo_of_sale_at).toLocaleDateString() : "—"}
                    </div>
                    <div>
                      Exchange: {d.exchange_at ? new Date(d.exchange_at).toLocaleDateString() : "—"}
                    </div>
                    <div>
                      Completion:{" "}
                      {d.completion_at ? new Date(d.completion_at).toLocaleDateString() : "—"}
                    </div>
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
