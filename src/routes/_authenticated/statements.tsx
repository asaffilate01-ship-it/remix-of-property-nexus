import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { collectPages } from "@/lib/portfolio-summary";
import {
  buildOwnerStatement, currentLondonMonth, statementMonthBounds,
  type OwnerStatementRow, type OwnerStatementTotals,
  type StatementCharge, type StatementProperty, type StatementWorkOrder,
} from "@/lib/owner-statement";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Receipt, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/statements")({
  head: () => ({ meta: [{ title: "Owner charge review — Gabley" }] }),
  component: StatementsPage,
});

type Report = { rows: OwnerStatementRow[]; totals: OwnerStatementTotals };
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function StatementsPage() {
  const { role, userId, loading: roleLoading } = useUserRole();
  const [month, setMonth] = useState(currentLondonMonth);
  const [report, setReport] = useState<Report | null>(null);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const monthLabel = useMemo(() => {
    try {
      statementMonthBounds(month);
      return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "long" })
        .format(new Date(`${month}-15T12:00:00Z`));
    } catch {
      return "selected month";
    }
  }, [month]);

  useEffect(() => {
    if (roleLoading) return;
    let active = true;
    setLoading(true);
    setReport(null);
    setError(null);
    void (async () => {
      try {
        if (!userId || !["admin", "agent", "landlord"].includes(role ?? "")) {
          throw new Error("Your account is not permitted to view owner charge reports.");
        }
        const bounds = statementMonthBounds(month);
        const properties = await collectPages(async (from, to) => {
          let query = supabase.from("properties")
            .select("id,title,address,city")
            .order("id")
            .range(from, to);
          // A landlord may see only their own properties in this report.
          if (role === "landlord") query = query.eq("owner_id", userId);
          const result = await query;
          return { data: result.data as StatementProperty[] | null, error: result.error };
        });
        if (!active) return;
        if (properties.length === 0) {
          setPortfolioCount(0);
          setReport(buildOwnerStatement([], [], [], month));
          return;
        }
        const [charges, repairs] = await Promise.all([
          collectPages(async (from, to) => {
            const result = await supabase.from("rent_schedule")
              .select("id,amount,paid_amount,due_date,status,tenancies!inner(property_id)")
              .gte("due_date", bounds.dueFrom)
              .lt("due_date", bounds.dueTo)
              .order("id")
              .range(from, to);
            return { data: result.data as unknown as StatementCharge[] | null, error: result.error };
          }),
          collectPages(async (from, to) => {
            const result = await supabase.from("work_orders")
              .select("id,property_id,actual_cost,completed_at,status")
              .eq("status", "completed")
              .not("actual_cost", "is", null)
              .gte("completed_at", bounds.workFrom)
              .lt("completed_at", bounds.workTo)
              .order("id")
              .range(from, to);
            return { data: result.data as StatementWorkOrder[] | null, error: result.error };
          }),
        ]);
        const result = buildOwnerStatement(properties, charges, repairs, month);
        if (!active) return;
        setPortfolioCount(properties.length);
        setReport(result);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to retrieve owner charges");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [month, reload, role, roleLoading, userId]);

  const cards = report ? [
    { label: "Rent charged", value: report.totals.due },
    { label: "Applied to charges", value: report.totals.applied },
    { label: "Outstanding on those charges", value: report.totals.outstanding },
    { label: "Completed repair costs", value: report.totals.expenses },
    { label: "Indicative net after repairs", value: report.totals.indicativeNet },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Owner charge review"
        description={`Charge-month overview for ${monthLabel}, across properties you can access.`}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="owner-statement-month" className="text-xs">Charge month</Label>
              <Input id="owner-statement-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-44" />
            </div>
            <Button variant="outline" type="button" onClick={() => setReload((value) => value + 1)} disabled={loading || roleLoading}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Refresh
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        This is a <strong className="text-foreground">rent-charge cohort review, not a bank statement or a cash-flow account</strong>.
        Applied amounts reflect the latest payment allocations against rent due in ${monthLabel}; completed repair costs reflect work completed within that London calendar month.
        Payments received for earlier charges and other operating costs are not included.
      </div>

      {loading || roleLoading ? (
        <div role="status" aria-live="polite" className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Loading the verified charge and repair figures…
        </div>
      ) : error || !report ? (
        <div role="alert" className="space-y-3 rounded-xl border bg-card p-8">
          <h2 className="text-lg font-semibold">This charge review is unavailable</h2>
          <p className="text-sm text-muted-foreground">{error ?? "The figures could not be verified."} No totals are shown while the request has failed.</p>
          <Button type="button" onClick={() => setReload((value) => value + 1)}>Try again</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {cards.map((card) => (
              <Card key={card.label} className="shadow-card">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                  <div className="mt-2 text-xl font-bold tabular break-words">{money.format(card.value)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          {report.rows.length === 0 ? (
            <Card className="border-dashed bg-transparent">
              <CardContent className="space-y-2 p-10 text-center">
                <Receipt className="mx-auto h-9 w-9 text-muted-foreground/60" aria-hidden="true" />
                <h2 className="font-semibold">{portfolioCount ? "No recorded activity in this charge month" : "No accessible properties"}</h2>
                <p className="text-sm text-muted-foreground">
                  {portfolioCount ? "Try a different month or review your rent schedules and completed work orders." : "Ask your workspace administrator to check your property access."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden shadow-card">
              <CardContent className="p-0">
                <div role="region" aria-label="Owner charge review by property" tabIndex={0} className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm tabular">
                    <caption className="sr-only">Charge-month amounts applied and completed repair costs by property</caption>
                    <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="p-3 text-left">Property</th>
                        <th scope="col" className="p-3 text-right">Charged</th>
                        <th scope="col" className="p-3 text-right">Applied</th>
                        <th scope="col" className="p-3 text-right">Outstanding</th>
                        <th scope="col" className="p-3 text-right">Repairs</th>
                        <th scope="col" className="p-3 text-right">Indicative net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row) => (
                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <th scope="row" className="p-3 text-left font-medium">{row.property}</th>
                          <td className="p-3 text-right">{money.format(row.due)}</td>
                          <td className="p-3 text-right">{money.format(row.applied)}</td>
                          <td className="p-3 text-right">
                            {row.outstanding > 0 ? <Badge variant="outline">{money.format(row.outstanding)}</Badge> : money.format(0)}
                          </td>
                          <td className="p-3 text-right">{money.format(row.expenses)}</td>
                          <td className="p-3 text-right font-semibold">{money.format(row.indicativeNet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
