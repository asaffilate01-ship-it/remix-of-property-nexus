import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, Gavel, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { bookViewing, logOffer, generateRentSchedule } from "@/lib/tenancy-lifecycle.functions";

export function TenancyActions({ tenancyId }: { tenancyId: string }) {
  const qc = useQueryClient();
  const bookFn = useServerFn(bookViewing);
  const offerFn = useServerFn(logOffer);
  const rentFn = useServerFn(generateRentSchedule);

  const [busy, setBusy] = useState<string | null>(null);
  const [openViewing, setOpenViewing] = useState(false);
  const [openOffer, setOpenOffer] = useState(false);
  const [openRent, setOpenRent] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["tenancy-lifecycle", tenancyId] });

  // viewing form state
  const [vName, setVName] = useState("");
  const [vEmail, setVEmail] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vWhen, setVWhen] = useState("");
  const [vDuration, setVDuration] = useState(30);
  const [vNotes, setVNotes] = useState("");

  // offer form state
  const [oName, setOName] = useState("");
  const [oEmail, setOEmail] = useState("");
  const [oPhone, setOPhone] = useState("");
  const [oAmount, setOAmount] = useState<number | "">("");
  const [oNotes, setONotes] = useState("");

  // rent state
  const [months, setMonths] = useState(12);
  const [replace, setReplace] = useState(false);

  const submitViewing = async () => {
    if (!vName || !vWhen) { toast.error("Name and date/time are required"); return; }
    setBusy("v");
    try {
      await bookFn({ data: {
        tenancyId, applicantName: vName, applicantEmail: vEmail || undefined,
        applicantPhone: vPhone || undefined, scheduledAt: new Date(vWhen).toISOString(),
        durationMinutes: vDuration, notes: vNotes || undefined,
      } });
      toast.success("Viewing booked");
      setOpenViewing(false);
      setVName(""); setVEmail(""); setVPhone(""); setVWhen(""); setVNotes("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const submitOffer = async () => {
    if (!oName || !oAmount) { toast.error("Buyer name and amount are required"); return; }
    setBusy("o");
    try {
      await offerFn({ data: {
        tenancyId, buyerName: oName, buyerEmail: oEmail || undefined,
        buyerPhone: oPhone || undefined, amount: Number(oAmount), notes: oNotes || undefined,
      } });
      toast.success("Offer logged");
      setOpenOffer(false);
      setOName(""); setOEmail(""); setOPhone(""); setOAmount(""); setONotes("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const submitRent = async () => {
    setBusy("r");
    try {
      const res = await rentFn({ data: { tenancyId, months, replace } });
      toast.success(`Generated ${res.count} rent periods`);
      setOpenRent(false);
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={openViewing} onOpenChange={setOpenViewing}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2"><CalendarPlus className="h-4 w-4" /> Book viewing</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Book a viewing</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1"><Label>Applicant name</Label><Input value={vName} onChange={(e) => setVName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1"><Label>Email</Label><Input type="email" value={vEmail} onChange={(e) => setVEmail(e.target.value)} /></div>
              <div className="grid gap-1"><Label>Phone</Label><Input value={vPhone} onChange={(e) => setVPhone(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1"><Label>Date &amp; time</Label><Input type="datetime-local" value={vWhen} onChange={(e) => setVWhen(e.target.value)} /></div>
              <div className="grid gap-1"><Label>Duration (min)</Label><Input type="number" value={vDuration} onChange={(e) => setVDuration(Number(e.target.value))} /></div>
            </div>
            <div className="grid gap-1"><Label>Notes</Label><Textarea value={vNotes} onChange={(e) => setVNotes(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button onClick={submitViewing} disabled={busy === "v"}>
              {busy === "v" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Book viewing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openOffer} onOpenChange={setOpenOffer}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2"><Gavel className="h-4 w-4" /> Log offer</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Log an offer</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1"><Label>Buyer / applicant name</Label><Input value={oName} onChange={(e) => setOName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1"><Label>Email</Label><Input type="email" value={oEmail} onChange={(e) => setOEmail(e.target.value)} /></div>
              <div className="grid gap-1"><Label>Phone</Label><Input value={oPhone} onChange={(e) => setOPhone(e.target.value)} /></div>
            </div>
            <div className="grid gap-1"><Label>Amount (£)</Label>
              <Input type="number" value={oAmount} onChange={(e) => setOAmount(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="grid gap-1"><Label>Notes</Label><Textarea value={oNotes} onChange={(e) => setONotes(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button onClick={submitOffer} disabled={busy === "o"}>
              {busy === "o" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Log offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openRent} onOpenChange={setOpenRent}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2"><Banknote className="h-4 w-4" /> Generate rent schedule</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate rent schedule</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Uses the tenancy's start date, rent amount and frequency to generate future periods.</p>
            <div className="grid gap-1"><Label>Number of periods</Label>
              <Input type="number" min={1} max={60} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Replace existing schedule
            </label>
          </div>
          <DialogFooter>
            <Button onClick={submitRent} disabled={busy === "r"}>
              {busy === "r" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
