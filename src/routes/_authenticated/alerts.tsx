import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldCheck, Banknote, RefreshCcw, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Gabley" }] }),
  component: AlertsPage,
});

type Alert = { id: string; kind: string; title: string; subtitle: string; severity: "danger" | "warn" | "info"; href?: string };

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = Date.now();
      const items: Alert[] = [];

      const [comp, tens, rent, view] = await Promise.all([
        supabase.from("compliance_records").select("id, type, expires_on, properties(address, city)").not("expires_on", "is", null),
        supabase.from("tenancies").select("id, end_date, status, tenants(full_name), properties(address, city)").eq("status", "active").not("end_date", "is", null),
        supabase.from("rent_schedule").select("id, due_date, amount, paid_at, tenancies(tenants(full_name), properties(address, city))").is("paid_at", null).lte("due_date", new Date().toISOString().slice(0, 10)),
        supabase.from("viewings").select("id, scheduled_at, applicant_name, status").eq("status", "pending").gt("scheduled_at", new Date().toISOString()),
      ]);

      for (const c of (comp.data as any[]) ?? []) {
        const ms = new Date(c.expires_on).getTime() - now;
        if (ms < 0) items.push({ id: `c-${c.id}`, kind: "compliance", title: `${c.type.replaceAll("_"," ")} expired`, subtitle: [c.properties?.address, c.properties?.city].filter(Boolean).join(", "), severity: "danger", href: "/compliance" });
        else if (ms < 30 * 86400000) items.push({ id: `c-${c.id}`, kind: "compliance", title: `${c.type.replaceAll("_"," ")} expires soon`, subtitle: `${Math.ceil(ms / 86400000)}d · ${[c.properties?.address, c.properties?.city].filter(Boolean).join(", ")}`, severity: "warn", href: "/compliance" });
      }
      for (const t of (tens.data as any[]) ?? []) {
        const ms = new Date(t.end_date).getTime() - now;
        if (ms < 90 * 86400000 && ms > 0) items.push({ id: `t-${t.id}`, kind: "renewal", title: `${t.tenants?.full_name ?? "Tenant"} ending in ${Math.ceil(ms / 86400000)}d`, subtitle: [t.properties?.address, t.properties?.city].filter(Boolean).join(", "), severity: ms < 30 * 86400000 ? "warn" : "info", href: `/tenancies/${t.id}` });
      }
      for (const r of (rent.data as any[]) ?? []) {
        const days = Math.floor((now - new Date(r.due_date).getTime()) / 86400000);
        items.push({ id: `r-${r.id}`, kind: "arrears", title: `£${Number(r.amount).toLocaleString()} overdue · ${days}d`, subtitle: `${r.tenancies?.tenants?.full_name ?? "Tenant"} · ${[r.tenancies?.properties?.address, r.tenancies?.properties?.city].filter(Boolean).join(", ")}`, severity: days > 30 ? "danger" : "warn", href: "/arrears" });
      }
      for (const v of (view.data as any[]) ?? []) {
        items.push({ id: `v-${v.id}`, kind: "viewing", title: `${v.applicant_name} awaiting confirmation`, subtitle: new Date(v.scheduled_at).toLocaleString(), severity: "info", href: "/viewings" });
      }

      const order = { danger: 0, warn: 1, info: 2 } as const;
      items.sort((a, b) => order[a.severity] - order[b.severity]);
      setAlerts(items);
      setLoading(false);
    })();
  }, []);

  const ICON = { compliance: ShieldCheck, arrears: Banknote, renewal: RefreshCcw, viewing: CalendarDays } as Record<string, typeof Bell>;
  const tone = (s: Alert["severity"]) => s === "danger" ? "bg-red-50 text-red-700 border-red-200" : s === "warn" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts & expiries" description="Everything that needs attention across compliance, arrears, renewals, and viewings." />

      {loading ? <Card className="animate-pulse"><CardContent className="h-40" /></Card> :
       alerts.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent"><CardContent className="p-12 text-center text-muted-foreground"><Bell className="mx-auto h-10 w-10 mb-3 opacity-40" /><div>All clear — nothing urgent.</div></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const Icon = ICON[a.kind] ?? Bell;
            const body = (
              <Card className="border-0 shadow-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-md grid place-items-center ${tone(a.severity)} border`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.subtitle}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{a.kind}</Badge>
                </CardContent>
              </Card>
            );
            return a.href ? <Link key={a.id} to={a.href as never} className="block">{body}</Link> : <div key={a.id}>{body}</div>;
          })}
        </div>
      )}
    </div>
  );
}
