import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { deleteBranch, listBranches, saveBranch } from "@/lib/branches.functions";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({ meta: [{ title: "Branches — Estately" }] }),
  component: BranchesPage,
});

type Branch = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  agency_id: string;
};

const empty = {
  id: "",
  name: "",
  address: "",
  city: "",
  postcode: "",
  phone: "",
  email: "",
  is_primary: false,
};

function BranchesPage() {
  const fetchBranches = useServerFn(listBranches);
  const persistBranch = useServerFn(saveBranch);
  const removeBranch = useServerFn(deleteBranch);
  const [rows, setRows] = useState<Branch[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchBranches({});
      setAgencyId(result.agencyId);
      setIsOwner(result.isOwner);
      setRows((result.branches as Branch[]) ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load branches");
    } finally {
      setLoading(false);
    }
  }, [fetchBranches]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (!agencyId) return toast.error("No agency — only agency owners can manage branches.");
    setSaving(true);
    const payload = {
      id: form.id || undefined,
      name: form.name.trim(),
      address: form.address || null,
      city: form.city || null,
      postcode: form.postcode || null,
      phone: form.phone || null,
      email: form.email || null,
      is_primary: form.is_primary,
    };
    try {
      const result = await persistBranch({ data: payload });
      toast.success(form.id ? "Updated" : "Branch added");
      if (result.billingWarning) toast.warning(result.billingWarning);
      setOpen(false);
      setForm(empty);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save branch");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: Branch) => {
    setForm({
      id: b.id,
      name: b.name,
      address: b.address ?? "",
      city: b.city ?? "",
      postcode: b.postcode ?? "",
      phone: b.phone ?? "",
      email: b.email ?? "",
      is_primary: b.is_primary,
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this branch?")) return;
    try {
      const result = await removeBranch({ data: { id } });
      toast.success("Deleted");
      if (result.billingWarning) toast.warning(result.billingWarning);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete branch");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Office locations under your agency."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setOpen(true);
            }}
            disabled={!agencyId || !isOwner}
          >
            <Plus className="mr-2 h-4 w-4" /> Add branch
          </Button>
        }
      />

      {!agencyId && !loading && (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            No agency is connected to this account. Set one up under Agency settings first.
          </CardContent>
        </Card>
      )}

      {agencyId && !isOwner && !loading && (
        <Card className="border-0 bg-muted/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Branch details are read-only. Only the agency owner can add, edit or remove branches
            because changes can affect billing.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-32" />
            </Card>
          ))}
        </div>
      ) : agencyId && rows.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <div>No branches yet. Add your first office.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => (
            <Card key={b.id} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2 truncate">
                      {b.name} {b.is_primary && <Badge variant="secondary">Primary</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[b.address, b.city, b.postcode].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {b.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {b.email}
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {b.phone}
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-1 pt-1 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(b)}
                      className="flex-1"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive h-8 w-8"
                      onClick={() => remove(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit branch" : "Add branch"}</DialogTitle>
          </DialogHeader>
          {!form.id && (
            <p className="text-xs text-muted-foreground">
              Adding a branch updates your subscription quantity and may create a prorated Stripe
              charge.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <label className="col-span-2 text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
              />{" "}
              Primary branch
            </label>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
