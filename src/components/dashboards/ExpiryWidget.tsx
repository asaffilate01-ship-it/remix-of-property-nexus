import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock, ArrowRight, UserCheck, FileWarning } from "lucide-react";
import { toast } from "sonner";

type Item = {
  kind: "property_compliance" | "hmo" | "tenant_compliance" | "tenant_doc";
  property_id: string | null;
  label: string;
  expires_at: string;
  days: number;
};

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const HORIZON_DAYS = 30;

const TENANT_KEY_LABELS: Record<string, string> = {
  right_to_rent_expires: "Right-to-Rent",
  passport_expires: "Passport",
  visa_expires: "Visa / BRP",
};

export function ExpiryWidget() {
  const [items, setItems] = useState<Item[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const horizon = new Date(Date.now() + HORIZON_DAYS * 86400000).toISOString().slice(0, 10);

      const [comp, hmo, tenancies, docs] = await Promise.all([
        supabase
          .from("compliance_records")
          .select("id, property_id, type, expires_on")
          .not("expires_on", "is", null)
          .lte("expires_on", horizon)
          .order("expires_on", { ascending: true })
          .limit(50),
        supabase
          .from("properties")
          .select("id, title, hmo_licence_expires")
          .not("hmo_licence_expires", "is", null)
          .lte("hmo_licence_expires", horizon)
          .limit(50),
        supabase
          .from("tenancies")
          .select("id, tenant_name, status, tenant_compliance")
          .in("status", ["active", "draft", "notice"])
          .limit(200),
        supabase
          .from("documents")
          .select("id, name, tenancy_id, expires_on")
          .not("expires_on", "is", null)
          .lte("expires_on", horizon)
          .not("tenancy_id", "is", null)
          .limit(50),
      ]);

      const firstError = comp.error ?? hmo.error ?? tenancies.error ?? docs.error;
      if (firstError) {
        toast.error(firstError.message);
        setItems([]);
        setMissing([]);
        setLoading(false);
        return;
      }

      const list: Item[] = [];
      const missingList: string[] = [];

      for (const r of (comp.data ?? []) as any[]) {
        list.push({
          kind: "property_compliance",
          property_id: r.property_id,
          label: String(r.type ?? "Certificate").replace(/_/g, " "),
          expires_at: r.expires_on,
          days: daysUntil(r.expires_on),
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
      for (const t of (tenancies.data ?? []) as any[]) {
        const tc = (t.tenant_compliance ?? {}) as Record<string, string | null>;
        for (const key of Object.keys(TENANT_KEY_LABELS)) {
          const v = tc[key];
          if (!v) {
            if (key === "right_to_rent_expires" && t.status === "active") {
              missingList.push(`${t.tenant_name} — missing Right-to-Rent`);
            }
            continue;
          }
          if (v <= horizon) {
            list.push({
              kind: "tenant_compliance",
              property_id: null,
              label: `${t.tenant_name} — ${TENANT_KEY_LABELS[key]}`,
              expires_at: v,
              days: daysUntil(v),
            });
          }
        }
      }
      for (const d of (docs.data ?? []) as any[]) {
        list.push({
          kind: "tenant_doc",
          property_id: null,
          label: `Doc: ${d.name}`,
          expires_at: d.expires_on,
          days: daysUntil(d.expires_on),
        });
      }

      list.sort((a, b) => a.days - b.days);
      setItems(list);
      setMissing(missingList.slice(0, 5));
      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel(`expiry-widget-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "compliance_records" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tenancies" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const overdue = items.filter((i) => i.days < 0).length;
  const soon = items.filter((i) => i.days >= 0 && i.days <= HORIZON_DAYS).length;

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            Expiry & compliance alerts
          </h3>
          <Link to="/compliance" className="text-xs text-primary hover:underline inline-flex items-center">
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {overdue > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {overdue} overdue
            </Badge>
          )}
          <Badge variant={soon > 0 ? "default" : "secondary"}>{soon} due in {HORIZON_DAYS}d</Badge>
          {missing.length > 0 && (
            <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
              <FileWarning className="h-3 w-3" /> {missing.length} missing
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
          </div>
        ) : items.length === 0 && missing.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">All certificates and tenant docs are current.</div>
        ) : (
          <>
            <div className="divide-y -mx-2">
              {items.slice(0, 6).map((i, idx) => (
                <div key={idx} className="px-2 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    {i.kind === "tenant_compliance" || i.kind === "tenant_doc"
                      ? <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                      : <CalendarClock className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm capitalize truncate">{i.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(i.expires_at).toLocaleDateString("en-GB")}
                      </div>
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
            {missing.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Missing documents</div>
                {missing.map((m, i) => (
                  <div key={i} className="text-xs flex items-center gap-1.5 text-amber-700">
                    <FileWarning className="h-3 w-3" /> {m}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
