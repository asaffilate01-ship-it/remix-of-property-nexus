import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { listBranches, saveBranch, deleteBranch } from "@/lib/branches.functions";
import { AddressLookup } from "@/components/address/AddressLookup";

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
};

const empty: Branch = { id: "", name: "", address: "", city: "", postcode: "", phone: "", email: "", is_primary: false };

function BranchesPage() {
  const fetch = useServerFn(listBranches);
  const save = useServerFn(saveBranch);
  const del = useServerFn(deleteBranch);
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Branch>(empty);

  const reload = async () => {
    const r = await fetch({});
    setItems((r.branches ?? []) as Branch[]);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const submit = async () => {
    if (!draft.name) { toast.error("Branch name is required"); return; }
    try {
      await save({ data: {
        id: draft.id || undefined,
        name: draft.name,
        address: draft.address || null,
        city: draft.city || null,
        postcode: draft.postcode || null,
        phone: draft.phone || null,
        email: draft.email || null,
        is_primary: draft.is_primary,
      } });
      setOpen(false); setDraft(empty); await reload();
      toast.success("Saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this branch? Listings/leads attached to it will be unlinked.")) return;
    await del({ data: { id } });
    await reload();
    toast.success("Deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground mt-1">Run multiple offices under one account. Pricing is per branch.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDraft(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setDraft(empty)}><Plus className="h-4 w-4 mr-1" /> Add branch</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{draft.id ? "Edit branch" : "Add branch"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="Branch name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Manchester — Deansgate" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"><Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
                <Field label="Postcode"><Input value={draft.postcode ?? ""} onChange={(e) => setDraft({ ...draft, postcode: e.target.value })} /></Field>
              </div>
              <Field label="Address"><Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
              </div>
              <label className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm">Set as head office</span>
                <Switch checked={draft.is_primary} onCheckedChange={(v) => setDraft({ ...draft, is_primary: v })} />
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3"><Building2 className="h-6 w-6 text-muted-foreground" /></div>
          <p className="font-medium">No branches yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first branch to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => (
            <Card key={b.id} className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{b.name}</div>
                    {b.postcode && <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{b.postcode}</div>}
                  </div>
                  {b.is_primary && <Badge variant="secondary">Head office</Badge>}
                </div>
                {b.address && <div className="text-sm text-muted-foreground">{b.address}{b.city ? `, ${b.city}` : ""}</div>}
                {b.phone && <div className="text-sm mt-1">{b.phone}</div>}
                {b.email && <div className="text-sm text-muted-foreground">{b.email}</div>}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => { setDraft(b); setOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
