import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitOffer } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Gavel } from "lucide-react";
import { toast } from "sonner";

type Props = {
  listingId: string;
  guidePrice?: number | null;
  purpose?: string | null;
};

export function OfferDialog({ listingId, guidePrice, purpose }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(guidePrice ? String(guidePrice) : "");
  const [financing, setFinancing] = useState<string>("mortgage");
  const [position, setPosition] = useState("");
  const [notes, setNotes] = useState("");
  const fn = useServerFn(submitOffer);

  const submit = async () => {
    if (!name.trim() || !amount) { toast.error("Name and offer amount required"); return; }
    if (!email.trim() && !phone.trim()) { toast.error("Email or phone number required"); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Invalid amount"); return; }
    setBusy(true);
    try {
      await fn({ data: {
        listing_id: listingId,
        buyer_name: name,
        buyer_email: email || undefined,
        buyer_phone: phone || undefined,
        amount: amt,
        financing: financing || undefined,
        position_in_chain: position ? Number(position) : undefined,
        notes: notes || undefined,
      }});
      toast.success("Offer submitted — the agent will be in touch.");
      setOpen(false);
      setName(""); setEmail(""); setPhone(""); setAmount(""); setNotes(""); setPosition("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit offer");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Gavel className="h-4 w-4 mr-1.5" /> Make an offer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Make an offer{purpose === "sale" ? "" : " (rent)"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Offer amount (£)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Financing</Label>
              <Select value={financing} onValueChange={setFinancing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash buyer</SelectItem>
                  <SelectItem value="mortgage">Mortgage (AIP in place)</SelectItem>
                  <SelectItem value="mortgage_pending">Mortgage (no AIP yet)</SelectItem>
                  <SelectItem value="btl">Buy-to-let</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Position in chain</Label><Input type="number" min={0} max={20} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="0 = no chain" /></div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions, timing, etc." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Submit offer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
