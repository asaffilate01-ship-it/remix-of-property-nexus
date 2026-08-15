import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Rec = {
  id: string;
  type: string;
  issued_on: string | null;
  expires_on: string | null;
  status: "valid" | "due_soon" | "expired" | "missing";
  reference: string | null;
};

const TYPES = [
  "gas_safety",
  "eicr",
  "epc",
  "pat",
  "fire_risk_assessment",
  "hmo_licence",
  "legionella",
] as const;

function computeStatus(expires?: string | null): Rec["status"] {
  if (!expires) return "missing";
  const t = new Date(expires).getTime();
  const now = Date.now();
  if (t < now) return "expired";
  if (t - now < 30 * 86_400_000) return "due_soon";
  return "valid";
}

const STATUS_TONE: Record<Rec["status"], string> = {
  valid: "bg-success text-success-foreground",
  due_soon: "bg-warning text-warning-foreground",
  expired: "bg-destructive text-destructive-foreground",
  missing: "bg-muted text-muted-foreground",
};

export function PropertyCompliancePanel({ propertyId }: { propertyId: string }) {
  const [rows, setRows] = useState<Rec[]>([]);
  const [editing, setEditing] = useState<{
    id?: string;
    type: string;
    issued_on: string;
    expires_on: string;
    reference: string;
  } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("compliance_records")
      .select("id, type, issued_on, expires_on, status, reference")
      .eq("property_id", propertyId)
      .order("expires_on", { ascending: true, nullsFirst: false });
    setRows((data as Rec[]) ?? []);
  }, [propertyId]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const payload: any = {
      type: editing.type,
      property_id: propertyId,
      issued_on: editing.issued_on || null,
      expires_on: editing.expires_on || null,
      reference: editing.reference || null,
      status: computeStatus(editing.expires_on),
    };
    const { error } = editing.id
      ? await supabase.from("compliance_records").update(payload).eq("id", editing.id)
      : await supabase.from("compliance_records").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from("compliance_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{rows.length} records</div>
        <Button
          size="sm"
          onClick={() =>
            setEditing({ type: "gas_safety", issued_on: "", expires_on: "", reference: "" })
          }
        >
          <Plus className="h-3 w-3 mr-1" /> Add record
        </Button>
      </div>
      {rows.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
          No compliance records for this property yet
        </div>
      )}
      {rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm capitalize">{r.type.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">
                  {r.issued_on && `Issued ${r.issued_on} • `}
                  {r.expires_on ? `Expires ${r.expires_on}` : "No expiry set"}
                  {r.reference && ` • Ref ${r.reference}`}
                </div>
              </div>
            </div>
            <div className="flex gap-1 items-center">
              <Badge className={STATUS_TONE[r.status]}>{r.status.replace("_", " ")}</Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setEditing({
                    id: r.id,
                    type: r.type,
                    issued_on: r.issued_on ?? "",
                    expires_on: r.expires_on ?? "",
                    reference: r.reference ?? "",
                  })
                }
              >
                <span className="text-xs">Edit</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => del(r.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit record" : "Add compliance record"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Type</Label>
                <Select
                  value={editing.type}
                  onValueChange={(v) => setEditing({ ...editing, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issued on</Label>
                <Input
                  type="date"
                  value={editing.issued_on}
                  onChange={(e) => setEditing({ ...editing, issued_on: e.target.value })}
                />
              </div>
              <div>
                <Label>Expires on</Label>
                <Input
                  type="date"
                  value={editing.expires_on}
                  onChange={(e) => setEditing({ ...editing, expires_on: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Reference</Label>
                <Input
                  value={editing.reference}
                  onChange={(e) => setEditing({ ...editing, reference: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
