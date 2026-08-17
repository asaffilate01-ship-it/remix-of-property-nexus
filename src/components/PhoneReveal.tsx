import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageCircle, PhoneCall, Mail, Copy } from "lucide-react";
import { toast } from "sonner";

type Props = {
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  agencyName?: string | null;
  context?: string;
};

function digits(s: string) {
  return s.replace(/[^0-9+]/g, "");
}

export function PhoneReveal({ phone, email, whatsapp, agencyName, context }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", time: "morning", message: context ?? "I'd like to know more about this listing." });

  if (!phone && !email && !whatsapp) return null;

  const wa = whatsapp ?? phone;
  const masked = phone ? `${phone.slice(0, 6).replace(/./g, (c) => (c === " " || c === "+" ? c : "0"))} ${phone.slice(-3)} •••` : "";

  const copy = async () => {
    if (!phone) return;
    await navigator.clipboard.writeText(phone);
    toast.success("Number copied");
  };

  const submitCallback = () => {
    if (!form.name || !form.phone) { toast.error("Name and phone required"); return; }
    toast.success(`Callback requested${agencyName ? ` with ${agencyName}` : ""}`);
    setCallbackOpen(false);
    setForm({ ...form, name: "", phone: "" });
  };

  return (
    <div className="space-y-2">
      {phone && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRevealed(true); }}
          className="w-full rounded-lg border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors p-3 flex items-center justify-between gap-3 group"
          aria-label="Show phone number"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs text-muted-foreground">Call agent</div>
              <div className={`font-mono font-semibold tracking-tight ${revealed ? "" : "blur-[3px] select-none"}`}>
                {revealed ? phone : masked || "020 •••• •••"}
              </div>
            </div>
          </div>
          {revealed ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Copy className="h-3 w-3" onClick={(e) => { e.stopPropagation(); copy(); }} />
            </span>
          ) : (
            <span className="text-xs font-medium text-primary shrink-0 group-hover:underline">Show</span>
          )}
        </button>
      )}

      {revealed && phone && (
        <Button asChild className="w-full" size="lg">
          <a href={`tel:${digits(phone)}`}><PhoneCall className="h-4 w-4 mr-2" /> Call now</a>
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {wa && (
          <Button asChild variant="outline" className="bg-[#25D366]/5 border-[#25D366]/30 hover:bg-[#25D366]/10 text-foreground">
            <a href={`https://wa.me/${digits(wa).replace(/^\+/, "")}?text=${encodeURIComponent(context ?? "Hi, I'd like to enquire about a property listed on Gabley.")}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4 mr-1.5 text-[#25D366]" /> WhatsApp
            </a>
          </Button>
        )}
        <Button variant="outline" onClick={() => setCallbackOpen(true)}>
          <Phone className="h-4 w-4 mr-1.5" /> Callback
        </Button>
      </div>

      {email && (
        <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
          <a href={`mailto:${email}`}><Mail className="h-4 w-4 mr-1.5" /> Email instead</a>
        </Button>
      )}

      <Dialog open={callbackOpen} onOpenChange={setCallbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a callback{agencyName ? ` from ${agencyName}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Your name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone number</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07…" /></div>
            <div>
              <Label>Best time to call</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {(["morning", "afternoon", "evening"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, time: t })}
                    className={`text-xs px-3 py-2 rounded-md border capitalize transition-colors ${form.time === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div><Label>Message (optional)</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCallbackOpen(false)}>Cancel</Button>
            <Button onClick={submitCallback}>Request callback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
