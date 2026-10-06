import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Plus, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listInvestorProfiles, saveInvestorProfile } from "@/lib/deal-intelligence.functions";

export const Route = createFileRoute("/_authenticated/deal-investors")({
  head: () => ({ meta: [{ title: "Deal investors — Gabley" }] }),
  component: DealInvestorsPage,
});

type Buyer = {
  id: string;
  full_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  areas: string[] | null;
  finance_status: string | null;
};

type Investor = {
  id: string;
  buyer_id: string | null;
  investor_ref: string;
  min_budget: number;
  max_budget: number;
  areas: string[];
  strategies: string[];
  funding_status: string;
  completion_days: number | null;
  min_profit_target: number | null;
  min_yield: number | null;
  accepts_refurbishment: boolean;
  accepts_council_scheme: boolean;
  buyer_profiles?: { full_name?: string | null } | null;
};

const initial = {
  buyerId: "",
  investorRef: "",
  minBudget: "",
  maxBudget: "",
  areas: "",
  strategies: "",
  fundingStatus: "unknown",
  completionDays: "",
  minProfitTarget: "",
  minYield: "",
  acceptsRefurbishment: false,
  acceptsCouncilScheme: false,
};

function DealInvestorsPage() {
  const list = useServerFn(listInvestorProfiles);
  const save = useServerFn(saveInvestorProfile);
  const [rows, setRows] = useState<Investor[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initial);

  const load = async () => {
    try {
      const [investors, buyerRows] = await Promise.all([
        list(),
        supabase
          .from("buyer_profiles")
          .select("id,full_name,budget_min,budget_max,areas,finance_status")
          .eq("active", true)
          .order("full_name"),
      ]);
      setRows((investors.rows ?? []) as Investor[]);
      if (buyerRows.error) throw buyerRows.error;
      setBuyers((buyerRows.data ?? []) as Buyer[]);
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const chooseBuyer = (buyerId: string) => {
    const buyer = buyers.find((row) => row.id === buyerId);
    setForm((current) => ({
      ...current,
      buyerId,
      investorRef: buyer?.full_name || current.investorRef,
      minBudget: buyer?.budget_min?.toString() || current.minBudget,
      maxBudget: buyer?.budget_max?.toString() || current.maxBudget,
      areas: buyer?.areas?.join(", ") || current.areas,
      fundingStatus:
        buyer?.finance_status === "cash"
          ? "cash_verified"
          : buyer?.finance_status === "aip"
            ? "aip"
            : buyer?.finance_status === "mortgage"
              ? "mortgage"
              : current.fundingStatus,
    }));
  };

  const submit = async () => {
    if (!form.investorRef.trim() || !form.maxBudget) {
      toast.error("Investor reference and maximum budget are required");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          buyerId: form.buyerId || null,
          investorRef: form.investorRef.trim(),
          minBudget: Number(form.minBudget || 0),
          maxBudget: Number(form.maxBudget),
          areas: form.areas.split(",").map((value) => value.trim()).filter(Boolean),
          strategies: form.strategies.split(",").map((value) => value.trim()).filter(Boolean),
          fundingStatus: form.fundingStatus as
            | "unknown"
            | "cash_verified"
            | "aip"
            | "bridging_ready"
            | "mortgage"
            | "other",
          completionDays: form.completionDays ? Number(form.completionDays) : null,
          minProfitTarget: form.minProfitTarget ? Number(form.minProfitTarget) : null,
          minYield: form.minYield ? Number(form.minYield) : null,
          acceptsRefurbishment: form.acceptsRefurbishment,
          acceptsCouncilScheme: form.acceptsCouncilScheme,
        },
      });
      toast.success("Investor mandate saved");
      setOpen(false);
      setForm(initial);
      await load();
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal investors"
        description="Buyer mandates used by Gabley Match. Funding readiness and criteria remain explicit and reviewable."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add investor mandate
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.id} className="border-0 shadow-card">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{row.investor_ref}</div>
                  {row.buyer_profiles?.full_name && (
                    <div className="text-xs text-muted-foreground">
                      Buyer: {row.buyer_profiles.full_name}
                    </div>
                  )}
                </div>
                <Badge variant="secondary">{row.funding_status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="text-sm font-medium">
                £{Number(row.min_budget ?? 0).toLocaleString()} – £
                {Number(row.max_budget ?? 0).toLocaleString()}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(row.areas ?? []).map((area) => (
                  <Badge key={area} variant="outline">
                    {area}
                  </Badge>
                ))}
                {(row.strategies ?? []).map((strategy) => (
                  <Badge key={strategy} variant="outline">
                    {strategy}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Refurb: {row.accepts_refurbishment ? "yes" : "no"}</span>
                <span>Council scheme: {row.accepts_council_scheme ? "yes" : "no"}</span>
                <span>Completion: {row.completion_days ? `${row.completion_days} days` : "not set"}</span>
                <span>
                  Profit target:{" "}
                  {row.min_profit_target
                    ? `£${Number(row.min_profit_target).toLocaleString()}`
                    : "not set"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <UserRoundSearch className="mx-auto h-10 w-10 mb-3 opacity-40" />
              No investor mandates yet.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add investor mandate</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Link existing buyer (optional)</Label>
              <Select value={form.buyerId} onValueChange={chooseBuyer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose buyer…" />
                </SelectTrigger>
                <SelectContent>
                  {buyers.map((buyer) => (
                    <SelectItem key={buyer.id} value={buyer.id}>
                      {buyer.full_name || buyer.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Investor / mandate reference *</Label>
              <Input
                value={form.investorRef}
                onChange={(event) => setForm({ ...form, investorRef: event.target.value })}
              />
            </div>
            <div>
              <Label>Minimum budget</Label>
              <Input
                type="number"
                value={form.minBudget}
                onChange={(event) => setForm({ ...form, minBudget: event.target.value })}
              />
            </div>
            <div>
              <Label>Maximum budget *</Label>
              <Input
                type="number"
                value={form.maxBudget}
                onChange={(event) => setForm({ ...form, maxBudget: event.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Areas / postcode prefixes</Label>
              <Input
                placeholder="LU, AL, MK"
                value={form.areas}
                onChange={(event) => setForm({ ...form, areas: event.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Strategies</Label>
              <Input
                placeholder="BTL, refurb, HMO, flip"
                value={form.strategies}
                onChange={(event) => setForm({ ...form, strategies: event.target.value })}
              />
            </div>
            <div>
              <Label>Funding readiness</Label>
              <Select
                value={form.fundingStatus}
                onValueChange={(fundingStatus) => setForm({ ...form, fundingStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="cash_verified">Cash verified</SelectItem>
                  <SelectItem value="aip">AIP</SelectItem>
                  <SelectItem value="bridging_ready">Bridging ready</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target completion days</Label>
              <Input
                type="number"
                value={form.completionDays}
                onChange={(event) => setForm({ ...form, completionDays: event.target.value })}
              />
            </div>
            <div>
              <Label>Minimum profit target</Label>
              <Input
                type="number"
                value={form.minProfitTarget}
                onChange={(event) => setForm({ ...form, minProfitTarget: event.target.value })}
              />
            </div>
            <div>
              <Label>Minimum yield %</Label>
              <Input
                type="number"
                step="0.1"
                value={form.minYield}
                onChange={(event) => setForm({ ...form, minYield: event.target.value })}
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.acceptsRefurbishment}
                onCheckedChange={(checked) =>
                  setForm({ ...form, acceptsRefurbishment: checked === true })
                }
              />
              Accepts refurbishment / works
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.acceptsCouncilScheme}
                onCheckedChange={(checked) =>
                  setForm({ ...form, acceptsCouncilScheme: checked === true })
                }
              />
              Accepts council / regeneration scheme conditions
            </label>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save mandate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
