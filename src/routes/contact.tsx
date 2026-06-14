import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Mail, Phone, MapPin, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Estately" },
      { name: "description", content: "Talk to our team about a free trial, a migration from your current CRM, or a tailored demo for your agency or portfolio." },
      { property: "og:title", content: "Contact Estately" },
      { property: "og:url", content: "https://proptest.313test.co.uk/contact" },
    ],
    links: [{ rel: "canonical", href: "https://proptest.313test.co.uk/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", topic: "demo", message: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return toast.error("Please fill in name, email and message.");
    setBusy(true);
    try {
      // Persist as a lead so sales sees it in the existing pipeline.
      const { error } = await supabase.from("leads").insert({
        full_name: form.name,
        email: form.email,
        phone: form.phone || null,
        source: "website_contact",
        notes: `Topic: ${form.topic}${form.company ? ` · Company: ${form.company}` : ""}\n\n${form.message}`,
      } as any);
      if (error) throw error;
      toast.success("Thanks — we'll be in touch within one working day.");
      setForm({ name: "", email: "", phone: "", company: "", topic: "demo", message: "" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send message");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="border-b">
          <div className="container mx-auto px-4 py-16 md:py-20 max-w-3xl">
            <div className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">Contact</div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Talk to us.</h1>
            <p className="text-lg text-muted-foreground">Book a demo, ask about migrations, or just say hello. We reply within one working day.</p>
          </div>
        </section>

        <section className="border-b">
          <div className="container mx-auto px-4 py-16 grid lg:grid-cols-[1fr_1.4fr] gap-10">
            <aside className="space-y-5">
              <Card><CardContent className="p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/10 grid place-items-center shrink-0"><Mail className="h-5 w-5 text-accent" /></div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
                  <a className="font-semibold hover:text-accent" href="mailto:hello@estately.app">hello@estately.app</a>
                  <div className="text-sm text-muted-foreground mt-1">Sales, support and general queries.</div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/10 grid place-items-center shrink-0"><Phone className="h-5 w-5 text-accent" /></div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Phone</div>
                  <a className="font-semibold hover:text-accent" href="tel:+442045771234">+44 20 4577 1234</a>
                  <div className="text-sm text-muted-foreground mt-1">Mon–Fri, 9am to 6pm GMT.</div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/10 grid place-items-center shrink-0"><MapPin className="h-5 w-5 text-accent" /></div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Office</div>
                  <div className="font-semibold">London · Manchester</div>
                  <div className="text-sm text-muted-foreground mt-1">Visits by appointment.</div>
                </div>
              </CardContent></Card>
            </aside>

            <Card>
              <CardContent className="p-7">
                <form className="grid sm:grid-cols-2 gap-4" onSubmit={submit}>
                  <div className="sm:col-span-2"><Label>Your name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                  <div><Label>I'd like</Label>
                    <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="demo">A product demo</SelectItem>
                        <SelectItem value="migration">To migrate from another CRM</SelectItem>
                        <SelectItem value="pricing">A pricing conversation</SelectItem>
                        <SelectItem value="support">Help with my account</SelectItem>
                        <SelectItem value="press">Press / partnerships</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2"><Label>Message *</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us a bit about your agency or portfolio." /></div>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                    <Button type="submit" size="lg" disabled={busy}>
                      {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      {busy ? "Sending…" : "Send message"}
                    </Button>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> We reply within one working day.</span>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="container mx-auto px-4 py-14 text-center text-sm text-muted-foreground">
            Looking for something else? See <Link to="/pricing" className="text-accent font-medium hover:underline">pricing</Link>, our <Link to="/about" className="text-accent font-medium hover:underline">story</Link>, or browse the <Link to="/marketplace" className="text-accent font-medium hover:underline">marketplace</Link>.
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
