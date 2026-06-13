import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock, ArrowRight } from "lucide-react";

type Item = {
  kind: "compliance" | "hmo";
  property_id: string | null;
  label: string;
  expires_at: string;
  days: number;
};

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export function ExpiryWidget() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const horizon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const [comp, hmo] = await Promise.all([
        supabase
          .from("compliance_records")
          .select("id, property_id, certificate_type, expires_at")
          .not("expires_at", "is", null)
          .lte("expires_at", horizon)
          .order("expires_at", { ascending: true })
          .limit(50),
        supabase
          .from("properties")
          .select("id, title, hmo_licence_expires")
          .not("hmo_licence_expires", "is", null)
          .lte("hmo_licence_expires", horizon)
          .limit(50),
      ]);
      const list: Item[] = [];
      for (const r of (comp.data ?? []) as any[]) {
        list.push({
          kind: "compliance",
          property_id: r.property_id,
          label: String(r.certificate_type ?? "Certificate").replace(/_/g, " "),
          expires_at: r.expires_at,
          days: daysUntil(r.expires_at),
        });
      }
      for (const p of (hmo.data ?? []) as any[]) {
        list.push({
          kind: "hmo",
          property_id: p.id,
          label: `HMO licence — ${p.title}`,
          expires_at: p.hmo_licence_expires,
          days: daysUntil(p.hmo_licence_expires),
        });
      }
      list.sort((a, b) => a.days - b.days);
      setItems(list);
      setLoading(false);
      void today;
    })();
  }, []);

  const overdue = items.filter((i) => i.days < 0).length;
  const soon = items.filter((i) => i.days >= 0 && i.days <= 30).length;

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            Expiring in 30 days
          </h3>
          <Link to="/compliance" className="text-xs text-primary hover:underline inline-flex items-center">
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>

        <div className="flex gap-2 mb-3">
          {overdue > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {overdue} overdue
            </Badge>
          )}
          <Badge variant={soon > 0 ? "default" : "secondary"}>{soon} due soon</Badge>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">All certificates are current.</div>
        ) : (
          <div className="divide-y -mx-2">
            {items.slice(0, 6).map((i, idx) => (
              <div key={idx} className="px-2 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm capitalize truncate">{i.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(i.expires_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <Badge
                  variant={i.days < 0 ? "destructive" : i.days <= 7 ? "default" : "secondary"}
                  className="shrink-0 text-[10px]"
                >
                  {i.days < 0 ? `${Math.abs(i.days)}d overdue` : `${i.days}d`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
