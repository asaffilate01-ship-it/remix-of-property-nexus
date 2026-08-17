import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, CheckCircle2, Landmark, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listBankTransactions,
  manualMatch,
  reconcileTransactions,
  seedMockBankFeed,
} from "@/lib/banking.functions";

export const Route = createFileRoute("/_authenticated/banking")({
  head: () => ({ meta: [{ title: "Bank reconciliation — Gabley" }] }),
  component: BankingPage,
});

function pounds(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function BankingPage() {
  const list = useServerFn(listBankTransactions);
  const reconcile = useServerFn(reconcileTransactions);
  const match = useServerFn(manualMatch);
  const seed = useServerFn(seedMockBankFeed);
  const query = useQuery({ queryKey: ["bank-reconciliation"], queryFn: () => list() });
  const [busy, setBusy] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const data = query.data;
  const transactions = data?.transactions ?? [];
  const rentSchedule = data?.rentSchedule ?? [];
  const unmatched = transactions.filter((transaction) => !transaction.matched_rent_schedule_id);
  const matched = transactions.length - unmatched.length;
  const openRent = rentSchedule.filter((rent) => rent.status !== "paid");

  const perform = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  if (query.isLoading) {
    return <Card className="animate-pulse"><CardContent className="h-48" /></Card>;
  }

  if (!data?.agencyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bank reconciliation" description="Match incoming rent payments to the correct tenancy." />
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">Create or join an agency before connecting rent payments.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank reconciliation"
        description="Review incoming credits and match them safely to outstanding rent. Automatic matching only acts on unique amounts with a strong tenant reference."
        actions={
          <div className="flex flex-wrap gap-2">
            {data.demoEnabled && (
              <Button variant="outline" disabled={busy !== null} onClick={() => perform("seed", () => seed(), "Demo transactions added")}>
                <Sparkles className="mr-2 h-4 w-4" />Demo feed
              </Button>
            )}
            <Button disabled={busy !== null || unmatched.length === 0} onClick={() => perform("auto", () => reconcile(), "Reconciliation complete")}>
              <RefreshCw className={`mr-2 h-4 w-4 ${busy === "auto" ? "animate-spin" : ""}`} />Auto-match safe payments
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Landmark} label="Imported credits" value={transactions.length} />
        <Metric icon={CheckCircle2} label="Matched" value={matched} tone="text-emerald-600" />
        <Metric icon={Banknote} label="Needs review" value={unmatched.length} tone={unmatched.length ? "text-amber-600" : "text-emerald-600"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="px-6 pb-8 text-sm text-muted-foreground">No bank credits have been imported yet. Configure your open-banking provider before launch.</div>
          ) : (
            <div className="divide-y">
              {transactions.map((transaction) => {
                const compatible = openRent.filter((rent) => Number(rent.amount) === Number(transaction.amount));
                const selected = selections[transaction.id] ?? "";
                return (
                  <div key={transaction.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(280px,1fr)] md:items-center md:px-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{pounds(Number(transaction.amount))}</span>
                        <Badge variant={transaction.matched_rent_schedule_id ? "default" : "secondary"}>
                          {transaction.matched_rent_schedule_id ? "Matched" : "Review"}
                        </Badge>
                      </div>
                      <div className="mt-1 truncate text-sm">{transaction.counterparty || "Unknown payer"}</div>
                      <div className="truncate text-xs text-muted-foreground">{transaction.reference || "No payment reference"} · {new Date(transaction.posted_at).toLocaleDateString("en-GB")}</div>
                    </div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{transaction.source}</div>
                    {transaction.matched_rent_schedule_id ? (
                      <div className="text-sm text-emerald-700 md:text-right">Recorded against rent schedule</div>
                    ) : compatible.length ? (
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                        <Select value={selected} onValueChange={(value) => setSelections((current) => ({ ...current, [transaction.id]: value }))}>
                          <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Choose rent item" /></SelectTrigger>
                          <SelectContent>
                            {compatible.map((rent) => (
                              <SelectItem key={rent.id} value={rent.id}>
                                {rent.tenancies?.tenant_name || "Tenant"} · due {new Date(rent.due_date).toLocaleDateString("en-GB")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          disabled={!selected || busy !== null}
                          onClick={() => perform(transaction.id, () => match({ data: { transaction_id: transaction.id, rent_schedule_id: selected } }), "Payment matched")}
                        >
                          Match
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground md:text-right">No outstanding rent has this exact amount.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "text-foreground" }: { icon: typeof Banknote; label: string; value: number; tone?: string }) {
  return (
    <Card><CardContent className="flex items-center gap-3 py-4">
      <div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className={`text-2xl font-bold ${tone}`}>{value}</div></div>
    </CardContent></Card>
  );
}
