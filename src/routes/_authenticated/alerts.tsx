import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchExpiries, type ExpiryItem } from "@/lib/alerts.functions";
import { AlertTriangle, FileSignature, FileText, ShieldCheck, Home, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/alerts")({ component: AlertsPage });

const ICONS = {
  contract: FileSignature,
  document: FileText,
  compliance: ShieldCheck,
  tenancy: Home,
};

const BUCKET_LABEL: Record<ExpiryItem["bucket"], string> = {
  overdue: "Overdue",
  "1d": "Due tomorrow",
  "7d": "Next 7 days",
  "14d": "Next 14 days",
  "30d": "Next 30 days",
  later: "Later",
};

function AlertsPage() {
  const load = useServerFn(fetchExpiries);
  const { data, isLoading } = useQuery({ queryKey: ["expiries"], queryFn: () => load() });
  const items = data?.items ?? [];
  const groups: Record<string, ExpiryItem[]> = {};
  items.forEach((i) => { (groups[i.bucket] ||= []).push(i); });
  const counts = (k: string) => groups[k]?.length ?? 0;
  const order: ExpiryItem["bucket"][] = ["overdue", "1d", "7d", "14d", "30d", "later"];

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts & expiries" description="Contracts, documents, compliance and tenancies expiring soon" />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {order.map((k) => (
          <Card key={k} className={`border-0 shadow-card ${k === "overdue" ? "bg-destructive/5" : ""}`}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase text-muted-foreground">{BUCKET_LABEL[k]}</div>
              <div className={`text-2xl font-bold ${k === "overdue" ? "text-destructive" : ""}`}>{counts(k)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all"><Bell className="h-3 w-3 mr-1" /> All ({items.length})</TabsTrigger>
          <TabsTrigger value="contract">Contracts</TabsTrigger>
          <TabsTrigger value="document">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="tenancy">Tenancies</TabsTrigger>
        </TabsList>

        {(["all", "contract", "document", "compliance", "tenancy"] as const).map((k) => {
          const list = k === "all" ? items : items.filter((i) => i.kind === k);
          return (
            <TabsContent key={k} value={k} className="space-y-2">
              {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!isLoading && list.length === 0 && <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">Nothing expiring</div>}
              {list.map((i) => {
                const Icon = ICONS[i.kind];
                const overdue = i.days_left < 0;
                return (
                  <Link to={i.link as any} key={i.id} className="block">
                    <Card className="border-0 shadow-card hover:shadow-elev transition-shadow">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${overdue ? "text-destructive" : "text-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{i.title}</div>
                          <div className="text-xs text-muted-foreground">{new Date(i.expires_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                        </div>
                        <Badge variant={overdue ? "destructive" : i.days_left <= 7 ? "default" : "secondary"} className="text-[10px]">
                          {overdue ? `${Math.abs(i.days_left)}d overdue` : i.days_left === 0 ? "Today" : `${i.days_left}d`}
                        </Badge>
                        {overdue && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
