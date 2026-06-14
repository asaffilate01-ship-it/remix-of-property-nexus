import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Building2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DEMO_ACCOUNTS, ensureDemoUsers } from "@/lib/dev.functions";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Estately" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"landlord" | "agent" | "tenant" | "buyer" | "conveyancer" | "contractor" | "inventory_clerk" | "utility_provider">("landlord");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const ensureDemo = useServerFn(ensureDemoUsers);

  const demoLogin = async (acct: typeof DEMO_ACCOUNTS[number]) => {
    setBusy(true);
    try {
      // Try sign-in first — demo accounts almost always already exist.
      let { error } = await supabase.auth.signInWithPassword({ email: acct.email, password: acct.password });
      if (error) {
        // Seed accounts on the server, then retry once.
        try { await ensureDemo({ data: undefined as never }); }
        catch (seedErr) { console.warn("ensureDemoUsers failed", seedErr); }
        ({ error } = await supabase.auth.signInWithPassword({ email: acct.email, password: acct.password }));
        if (error) throw error;
      }
      toast.success(`Signed in as ${acct.name}`);
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Demo sign-in failed");
    } finally { setBusy(false); }
  };

  const handle = async () => {
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: name, role },
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
        if (error) throw error;
        toast.success("Account created — redirecting…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex brand-gradient text-white p-12 flex-col justify-between relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl relative z-10">
          <span className="bg-white/20 backdrop-blur inline-flex h-10 w-10 items-center justify-center rounded-lg"><Building2 className="h-5 w-5" /></span>
          Estately
        </Link>
        <div className="max-w-md relative z-10">
          <h2 className="text-4xl xl:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">Your portfolio, your team — one calm workspace.</h2>
          <p className="text-white/80 text-lg">Marketplace, compliance and CRM. Estately is built for modern estate and letting agencies.</p>
        </div>
        <div className="text-sm text-white/60 relative z-10">© {new Date().getFullYear()} Estately</div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md shadow-card border-0">
          <CardContent className="p-8">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-0">
                <Field id="email" label="Email" type="email" value={email} onChange={setEmail} />
                <PasswordField value={password} onChange={setPassword} show={show} setShow={setShow} />
                <Button className="w-full" onClick={handle} disabled={busy || !email || !password}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <Field id="name" label="Full name" value={name} onChange={setName} />
                <Field id="email2" label="Email" type="email" value={email} onChange={setEmail} />
                <PasswordField value={password} onChange={setPassword} show={show} setShow={setShow} />
                <div className="space-y-2">
                  <Label>I am a…</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord">Landlord / HMO operator</SelectItem>
                      <SelectItem value="agent">Letting / sales agent</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                      <SelectItem value="buyer">Buyer / renter</SelectItem>
                      <SelectItem value="conveyancer">Conveyancer / solicitor</SelectItem>
                      <SelectItem value="contractor">Trade / contractor</SelectItem>
                      <SelectItem value="inventory_clerk">Inventory / EPC / Gas engineer</SelectItem>
                      <SelectItem value="utility_provider">Utility / referencing / insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handle} disabled={busy || !email || !password || !name}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="font-medium">Try a demo account</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide bg-accent/10 text-accent px-2 py-0.5 rounded-full">Dev</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <Button key={a.email} variant="outline" size="sm" disabled={busy} onClick={() => demoLogin(a)} className="justify-start text-xs">
                    {busy ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                    {a.name.replace("Demo ", "")}
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">First click seeds the accounts. Password: <code className="font-mono">demo1234</code></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ id, label, type = "text", value, onChange }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PasswordField({ value, onChange, show, setShow }: { value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="pw">Password</Label>
      <div className="relative">
        <Input id="pw" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
