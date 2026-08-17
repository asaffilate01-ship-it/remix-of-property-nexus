import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { siteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/complaints")({
  component: ComplaintsPage,
  head: () => ({
    meta: [
      { title: "Complaints — Gabley" },
      { name: "description", content: "Gabley complaints procedure and escalation route to The Property Ombudsman." },
      { property: "og:title", content: "Complaints — Gabley" },
      { property: "og:description", content: "How to raise a complaint with Gabley and escalate to The Property Ombudsman." },
      { property: "og:url", content: siteUrl("/complaints") },
    ],
    links: [{ rel: "canonical", href: siteUrl("/complaints") }],
  }),
});

function ComplaintsPage() {
  const [form, setForm] = useState({ name: "", email: "", reference: "", detail: "" });
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.detail.trim()) {
      toast.error("Please complete the required fields"); return;
    }
    // For now, open mailto with structured body — wiring to a backend can come later.
    const body = encodeURIComponent(
      `Name: ${form.name}\nReference: ${form.reference || "(none)"}\n\n${form.detail}`,
    );
    window.location.href = `mailto:complaints@gabley.co.uk?subject=${encodeURIComponent("Complaint — " + form.name)}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Complaints procedure</h1>
        <p className="text-muted-foreground mt-2">
          We take every complaint seriously and aim to resolve issues quickly and fairly.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mt-8 text-sm">
          <Card><CardContent className="p-4">
            <div className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Step 1</div>
            <p className="text-muted-foreground mt-1">Tell us. We acknowledge within <strong>3 working days</strong>.</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Step 2</div>
            <p className="text-muted-foreground mt-1">Full written response within <strong>15 working days</strong>.</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="font-semibold flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Step 3</div>
            <p className="text-muted-foreground mt-1">If unresolved after <strong>8 weeks</strong>, escalate to The Property Ombudsman.</p>
          </CardContent></Card>
        </div>

        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Submit a complaint</h2>
            {sent ? (
              <p className="text-sm">Thanks — your email client has opened. We'll respond within 3 working days.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label htmlFor="cname">Your name *</Label><Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required /></div>
                  <div><Label htmlFor="cemail">Email *</Label><Input id="cemail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} required /></div>
                </div>
                <div><Label htmlFor="cref">Reference (optional)</Label><Input id="cref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} maxLength={80} placeholder="Property, listing, agency, work-order ID" /></div>
                <div><Label htmlFor="cdetail">Details *</Label><Textarea id="cdetail" rows={6} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} maxLength={4000} required /></div>
                <Button type="submit">Send complaint</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-10 border-t pt-6 text-sm text-muted-foreground space-y-2">
          <p><strong>The Property Ombudsman</strong>, Milford House, 43-55 Milford Street, Salisbury, Wiltshire SP1 2BP. <a className="underline" href="https://www.tpos.co.uk" target="_blank" rel="noopener noreferrer">www.tpos.co.uk</a></p>
          <p>You may also contact the Information Commissioner's Office about data-protection concerns at <a className="underline" href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
