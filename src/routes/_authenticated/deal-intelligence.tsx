import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Building2,
  Handshake,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDealOpportunity,
  introduceMatch,
  listDealOpportunities,
  listOpportunityMatches,
  refreshOpportunityMatches,
  setDealCommercialReadiness,
  startDealIntelligence,
} from "@/lib/deal-intelligence.functions";

export const Route = createFileRoute("/_authenticated/deal-intelligence")({
  head: () => ({ meta: [{ title: "Deal intelligence — Gabley" }] }),
  component: DealIntelligencePage,
});

type Row = {
  id: string;
  title: string;
  postcode: string | null;
  purchase_price: number;
  conservative_exit_value: number;
  works_cost: number;
  other_costs: number;
  investor_profit_target: number;
  proposed_fee: number;
  fee_payer: "buyer" | "seller" | "split";
  fee_vat_treatment: "inclusive" | "exclusive" | "not_applicable";
  fee_disclosed: boolean;
  fee_disclosure_reference: string | null;
  seller_authority_confirmed: boolean;
  seller_authority_reference: string | null;
  status: string;
  ai_run_id: string | null;
  domureva_case_ref: string | null;
  analysis: any;
};

type Match = {
  id: string;
  score: number;
  reasons: string[];
  status: string;
  buyer_terms_accepted: boolean;
  investor_profiles?: {
    investor_ref?: string;
    max_budget?: number;
    funding_status?: string;
  } | null;
};

const initial = {
  title: "",
  postcode: "",
  purchasePrice: "",
  conservativeExitValue: "",
  worksCost: "0",
  otherCosts: "0",
  investorProfitTarget: "0",
  proposedFee: "0",
};

function DealIntelligencePage() {
  const list = useServerFn(listDealOpportunities);
  const create = useServerFn(createDealOpportunity);
  const start = useServerFn(startDealIntelligence);
  const refreshMatches = useServerFn(refreshOpportunityMatches);
  const readMatches = useServerFn(listOpportunityMatches);
  const saveReadiness = useServerFn(setDealCommercialReadiness);
  const introduce = useServerFn(introduceMatch);

  const [rows, setRows] = useState<Row[]>([]);
  const [matches, setMatches] = useState<Record<string, Match[]>>({});
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const [commercial, setCommercial] = useState<Row | null>(null);
  const [introducing, setIntroducing] = useState<{ matchId: string; investorRef: string } | null>(
    null,
  );
  const [buyerTermsReference, setBuyerTermsReference] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const [terms, setTerms] = useState({
    proposedFee: "0",
    feePayer: "buyer" as Row["fee_payer"],
    vatTreatment: "inclusive" as Row["fee_vat_treatment"],
    feeDisclosed: false,
    feeDisclosureReference: "",
    sellerAuthorityConfirmed: false,
    sellerAuthorityReference: "",
  });

  const load = async () => {
    try {
      const output = await list();
      setRows((output.rows ?? []) as Row[]);
      setConnected(output.omniqoraConnected);
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setBusy("create");
    try {
      await create({
        data: {
          title: form.title,
          postcode: form.postcode || null,
          purchasePrice: Number(form.purchasePrice),
          conservativeExitValue: Number(form.conservativeExitValue),
          worksCost: Number(form.worksCost),
          otherCosts: Number(form.otherCosts),
          investorProfitTarget: Number(form.investorProfitTarget),
          proposedFee: Number(form.proposedFee),
        },
      });
      setOpen(false);
      setForm(initial);
      toast.success("Deal opportunity created");
      await load();
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setBusy(null);
    }
  };

  const analyse = async (
    id: string,
    serviceKey: "omniqora.deal-detective" | "omniqora.property-match",
  ) => {
    setBusy(`${serviceKey}:${id}`);
    try {
      const output = await start({ data: { opportunityId: id, serviceKey } });
      toast.success(
        serviceKey === "omniqora.property-match"
          ? `AI match review queued: ${output.status}`
          : `Deal Detective queued: ${output.status}`,
      );
      await load();
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setBusy(null);
    }
  };

  const findBuyers = async (id: string) => {
    setBusy(`match:${id}`);
    try {
      const result = await refreshMatches({ data: { opportunityId: id } });
      const full = await readMatches({ data: { opportunityId: id } });
      setMatches((current) => ({ ...current, [id]: full as Match[] }));
      toast.success(
        result.matches.length
          ? `Found ${result.matches.length} matching investor mandate(s)`
          : "No matching investor mandates yet",
      );
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setBusy(null);
    }
  };

  const openCommercial = (row: Row) => {
    setCommercial(row);
    setTerms({
      proposedFee: Number(row.proposed_fee ?? 0).toString(),
      feePayer: row.fee_payer ?? "buyer",
      vatTreatment: row.fee_vat_treatment ?? "inclusive",
      feeDisclosed: row.fee_disclosed,
      feeDisclosureReference: row.fee_disclosure_reference ?? "",
      sellerAuthorityConfirmed: row.seller_authority_confirmed,
      sellerAuthorityReference: row.seller_authority_reference ?? "",
    });
  };

  const saveCommercial = async () => {
    if (!commercial) return;
    setBusy(`terms:${commercial.id}`);
    try {
      await saveReadiness({
        data: {
          opportunityId: commercial.id,
          proposedFee: Number(terms.proposedFee || 0),
          feePayer: terms.feePayer,
          vatTreatment: terms.vatTreatment,
          feeDisclosed: terms.feeDisclosed,
          feeDisclosureReference: terms.feeDisclosureReference || null,
          sellerAuthorityConfirmed: terms.sellerAuthorityConfirmed,
          sellerAuthorityReference: terms.sellerAuthorityReference || null,
        },
      });
      toast.success("Commercial readiness updated");
      setCommercial(null);
      await load();
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setBusy(null);
    }
  };

  const completeIntroduction = async () => {
    if (!introducing || !buyerTermsReference.trim()) return;
    setBusy(`introduce:${introducing.matchId}`);
    try {
      await introduce({
        data: {
          matchId: introducing.matchId,
          buyerTermsAccepted: true,
          buyerTermsReference: buyerTermsReference.trim(),
        },
      });
      toast.success("Buyer introduction recorded");
      setIntroducing(null);
      setBuyerTermsReference("");
      const refreshed = await Promise.all(
        rows.map(async (row) => [
          row.id,
          (await readMatches({ data: { opportunityId: row.id } })) as Match[],
        ] as const),
      );
      setMatches(Object.fromEntries(refreshed));
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal intelligence"
        description="Underwrite seller opportunities, investigate discounts, match investors and attach reviewed DOMUREVA regeneration funding."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New opportunity
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <BrainCircuit className="h-5 w-5 mb-2" />
            <div className="text-sm font-medium">Omniqora intelligence</div>
            <Badge variant="outline" className="mt-2">
              {connected ? "tenant mapped" : "mapping required"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <Landmark className="h-5 w-5 mb-2" />
            <div className="text-sm font-medium">DOMUREVA funding</div>
            <div className="text-xs text-muted-foreground mt-2">
              Only reviewed assessments are accepted.
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <Building2 className="h-5 w-5 mb-2" />
            <div className="text-sm font-medium">Gabley system of record</div>
            <div className="text-xs text-muted-foreground mt-2">
              Seller, buyer, disclosed fee and transaction remain here.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => {
          const economics = row.analysis?.economics ?? {};
          const domureva = row.analysis?.domureva;
          const rowMatches = matches[row.id] ?? [];
          const ready = row.fee_disclosed && row.seller_authority_confirmed;
          return (
            <Card key={row.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{row.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.postcode || "No postcode"} · {row.status}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    £{Number(row.purchase_price).toLocaleString()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Metric
                    label="Conservative exit"
                    value={`£${Number(row.conservative_exit_value).toLocaleString()}`}
                  />
                  <Metric
                    label="Fee headroom"
                    value={`£${Number(economics.feeHeadroom ?? 0).toLocaleString()}`}
                  />
                  <Metric
                    label="Proposed fee"
                    value={`£${Number(row.proposed_fee).toLocaleString()}`}
                  />
                  <Metric
                    label="Investor buffer"
                    value={`£${Number(economics.investorBufferAfterFee ?? 0).toLocaleString()}`}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={row.seller_authority_confirmed ? "secondary" : "outline"}>
                    <Handshake className="mr-1 h-3 w-3" />
                    seller authority {row.seller_authority_confirmed ? "recorded" : "missing"}
                  </Badge>
                  <Badge variant={row.fee_disclosed ? "secondary" : "outline"}>
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    fee {row.fee_disclosed ? "disclosed" : "not disclosed"}
                  </Badge>
                  {row.domureva_case_ref && (
                    <Badge variant="secondary">
                      <Landmark className="mr-1 h-3 w-3" />
                      DOMUREVA
                    </Badge>
                  )}
                </div>

                {domureva && (
                  <div className="rounded-md border p-3 text-xs">
                    <div className="font-medium">DOMUREVA: {domureva.eligibility}</div>
                    <div className="text-muted-foreground">
                      {domureva.schemes?.length ?? 0} reviewed scheme(s) · case {domureva.caseRef}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openCommercial(row)}>
                    Commercial terms
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => findBuyers(row.id)}
                    disabled={busy === `match:${row.id}`}
                  >
                    {busy === `match:${row.id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="mr-2 h-4 w-4" />
                    )}
                    Find buyers
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => analyse(row.id, "omniqora.deal-detective")}
                    disabled={!connected || busy === `omniqora.deal-detective:${row.id}`}
                  >
                    {busy === `omniqora.deal-detective:${row.id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Deal Detective
                  </Button>
                  {rowMatches.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => analyse(row.id, "omniqora.property-match")}
                      disabled={!connected || busy === `omniqora.property-match:${row.id}`}
                    >
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      AI match review
                    </Button>
                  )}
                </div>

                {rowMatches.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Investor matches
                    </div>
                    {rowMatches.slice(0, 5).map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {match.investor_profiles?.investor_ref || "Investor"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Number(match.score).toFixed(0)}% ·{" "}
                            {(match.reasons ?? []).slice(0, 3).join(", ")}
                          </div>
                        </div>
                        {match.status === "introduced" ? (
                          <Badge>introduced</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!ready}
                            title={
                              ready
                                ? "Record buyer terms and introduction"
                                : "Record seller authority and fee disclosure first"
                            }
                            onClick={() =>
                              setIntroducing({
                                matchId: match.id,
                                investorRef:
                                  match.investor_profiles?.investor_ref || "Investor",
                              })
                            }
                          >
                            Introduce
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No deal opportunities yet.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New deal opportunity</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["title", "Title"],
              ["postcode", "Postcode"],
              ["purchasePrice", "Seller / purchase price"],
              ["conservativeExitValue", "Conservative exit value"],
              ["worksCost", "Works"],
              ["otherCosts", "Other costs"],
              ["investorProfitTarget", "Investor profit target"],
              ["proposedFee", "Proposed fee"],
            ].map(([key, label]) => (
              <div key={key} className={key === "title" || key === "postcode" ? "col-span-2" : ""}>
                <Label>{label}</Label>
                <Input
                  type={["title", "postcode"].includes(key) ? "text" : "number"}
                  value={(form as any)[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={save}
              disabled={
                busy === "create" ||
                !form.title ||
                !form.purchasePrice ||
                !form.conservativeExitValue
              }
            >
              {busy === "create" ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(commercial)} onOpenChange={(value) => !value && setCommercial(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Commercial readiness</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Record the fee structure, the disclosure evidence and seller authority before any
            buyer introduction. References should point to your signed agreement/document record.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Proposed fee</Label>
              <Input
                type="number"
                value={terms.proposedFee}
                onChange={(event) => setTerms({ ...terms, proposedFee: event.target.value })}
              />
            </div>
            <div>
              <Label>Fee payer</Label>
              <Select
                value={terms.feePayer}
                onValueChange={(feePayer) =>
                  setTerms({ ...terms, feePayer: feePayer as Row["fee_payer"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>VAT treatment</Label>
              <Select
                value={terms.vatTreatment}
                onValueChange={(vatTreatment) =>
                  setTerms({
                    ...terms,
                    vatTreatment: vatTreatment as Row["fee_vat_treatment"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inclusive">Inclusive</SelectItem>
                  <SelectItem value="exclusive">Plus VAT / exclusive</SelectItem>
                  <SelectItem value="not_applicable">Not applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={terms.sellerAuthorityConfirmed}
                onCheckedChange={(checked) =>
                  setTerms({ ...terms, sellerAuthorityConfirmed: checked === true })
                }
              />
              Seller authority / engagement is signed and verified
            </label>
            <div className="col-span-2">
              <Label>Seller authority evidence reference</Label>
              <Input
                placeholder="Document ID, e-sign envelope or matter reference"
                value={terms.sellerAuthorityReference}
                onChange={(event) =>
                  setTerms({ ...terms, sellerAuthorityReference: event.target.value })
                }
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={terms.feeDisclosed}
                onCheckedChange={(checked) =>
                  setTerms({ ...terms, feeDisclosed: checked === true })
                }
              />
              Fee and payer have been disclosed in the signed terms
            </label>
            <div className="col-span-2">
              <Label>Fee disclosure evidence reference</Label>
              <Input
                placeholder="Signed sourcing/agency agreement reference"
                value={terms.feeDisclosureReference}
                onChange={(event) =>
                  setTerms({ ...terms, feeDisclosureReference: event.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={saveCommercial}
              disabled={Boolean(commercial && busy === `terms:${commercial.id}`)}
            >
              Save readiness
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(introducing)}
        onOpenChange={(value) => {
          if (!value) {
            setIntroducing(null);
            setBuyerTermsReference("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record buyer introduction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {introducing?.investorRef}. The database will reject the introduction unless seller
            authority and fee disclosure have already been evidenced.
          </p>
          <div>
            <Label>Buyer terms / engagement evidence reference</Label>
            <Input
              value={buyerTermsReference}
              onChange={(event) => setBuyerTermsReference(event.target.value)}
              placeholder="Signed buyer sourcing agreement or e-sign envelope reference"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={completeIntroduction}
              disabled={
                !buyerTermsReference.trim() ||
                Boolean(introducing && busy === `introduce:${introducing.matchId}`)
              }
            >
              Record introduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="font-medium">{value}</div>
    </div>
  );
}
