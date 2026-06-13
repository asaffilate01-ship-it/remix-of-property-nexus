import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, ShieldCheck, FileText, Briefcase, Home, Landmark, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/referencing")({
  head: () => ({ meta: [{ title: "Tenant referencing | Estately" }, { name: "description", content: "Complete your tenant reference online — identity, employment, landlord history and affordability — in under 10 minutes." }] }),
  component: ReferencingPage,
});

const steps = [
  { key: "personal", label: "About you", icon: ShieldCheck },
  { key: "address", label: "Address history", icon: Home },
  { key: "employer", label: "Employment", icon: Briefcase },
  { key: "landlord", label: "Current landlord", icon: Landmark },
  { key: "consent", label: "Consent & ID", icon: FileText },
] as const;

function ReferencingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: "", dob: "", email: "", phone: "",
    address: "", years_at: "", previous_address: "",
    employer: "", role: "", salary: "", contract: "permanent",
    landlord_name: "", landlord_email: "", rent_paid: "", arrears: "no",
    id_type: "passport", consent: false,
  });
  const set = (k: string, v: string | boolean) => setData((d) => ({ ...d, [k]: v }));

  const last = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const submit = () => {
    if (!data.consent) { toast.error("Please tick the consent box"); return; }
    toast.success("Reference submitted — we'll be in touch within 48h");
    setStep(0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="brand-gradient">
          <div className="container mx-auto px-4 py-10 md:py-14 text-white">
            <Badge className="bg-white/15 text-white border-0 mb-3">Goodlord-grade reference</Badge>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Tenant referencing</h1>
            <p className="text-white/85 mt-2 max-w-2xl">Verify identity, income, employment and rental history online. Most applicants finish in under 10 minutes.</p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-10 max-w-3xl">
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Step {step + 1} of {steps.length} — {steps[step].label}</span><span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {steps.map((s, i) => {
                const Done = i < step; const Active = i === step;
                return (
                  <div key={s.key} className={`text-center text-[10px] sm:text-xs ${Active ? "text-foreground font-medium" : Done ? "text-primary" : "text-muted-foreground"}`}>
                    <div className={`mx-auto h-7 w-7 rounded-full flex items-center justify-center mb-1 ${Done ? "bg-primary text-primary-foreground" : Active ? "bg-primary/10 text-primary ring-2 ring-primary" : "bg-muted"}`}>
                      {Done ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5 md:p-6 space-y-4">
              {step === 0 && (<>
                <Field label="Full name"><Input value={data.name} onChange={(e) => set("name", e.target.value)} /></Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Date of birth"><Input type="date" value={data.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
                  <Field label="Phone"><Input value={data.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                </div>
                <Field label="Email"><Input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} /></Field>
              </>)}
              {step === 1 && (<>
                <Field label="Current address"><Textarea value={data.address} onChange={(e) => set("address", e.target.value)} rows={2} /></Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Years at this address"><Input inputMode="numeric" value={data.years_at} onChange={(e) => set("years_at", e.target.value)} /></Field>
                  <Field label="Previous address (if <3 yrs)"><Input value={data.previous_address} onChange={(e) => set("previous_address", e.target.value)} /></Field>
                </div>
              </>)}
              {step === 2 && (<>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Employer"><Input value={data.employer} onChange={(e) => set("employer", e.target.value)} /></Field>
                  <Field label="Role"><Input value={data.role} onChange={(e) => set("role", e.target.value)} /></Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Gross annual salary (£)"><Input inputMode="numeric" value={data.salary} onChange={(e) => set("salary", e.target.value)} /></Field>
                  <Field label="Contract type">
                    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={data.contract} onChange={(e) => set("contract", e.target.value)}>
                      <option value="permanent">Permanent</option><option value="fixed_term">Fixed term</option><option value="self_employed">Self employed</option><option value="contractor">Contractor</option>
                    </select>
                  </Field>
                </div>
              </>)}
              {step === 3 && (<>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Landlord name"><Input value={data.landlord_name} onChange={(e) => set("landlord_name", e.target.value)} /></Field>
                  <Field label="Landlord email"><Input type="email" value={data.landlord_email} onChange={(e) => set("landlord_email", e.target.value)} /></Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Current monthly rent (£)"><Input inputMode="numeric" value={data.rent_paid} onChange={(e) => set("rent_paid", e.target.value)} /></Field>
                  <Field label="Any rent arrears?">
                    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={data.arrears} onChange={(e) => set("arrears", e.target.value)}>
                      <option value="no">No</option><option value="yes">Yes</option>
                    </select>
                  </Field>
                </div>
              </>)}
              {step === 4 && (<>
                <Field label="ID document type">
                  <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={data.id_type} onChange={(e) => set("id_type", e.target.value)}>
                    <option value="passport">Passport</option><option value="driving_licence">UK driving licence</option><option value="brp">Biometric residence permit</option>
                  </select>
                </Field>
                <div className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
                  Drop your photo ID and a recent payslip here, or <span className="text-primary underline">browse</span>
                </div>
                <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={data.consent} onChange={(e) => set("consent", e.target.checked)} />
                  <span className="text-sm">I consent to Estately and its referencing partner verifying my employment, landlord history, credit file and right to rent under UK GDPR.</span>
                </label>
              </>)}
            </CardContent>
          </Card>

          <div className="mt-5 flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            {last
              ? <Button onClick={submit}>Submit reference <Check className="h-4 w-4 ml-1" /></Button>
              : <Button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
