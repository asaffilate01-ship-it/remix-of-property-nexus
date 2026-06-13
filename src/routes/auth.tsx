import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Home, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — HMOFlow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"landlord" | "agent" | "tenant" | "buyer">("landlord");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) { toast.error("Google sign-in failed"); setBusy(false); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex brand-gradient text-white p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="bg-white/20 inline-flex h-9 w-9 items-center justify-center rounded-md"><Home className="h-5 w-5" /></span>
          HMOFlow
        </Link>
        <div className="max-w-md">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Your portfolio, your team, one platform.</h2>
          <p className="text-white/80">Marketplace, compliance, and CRM — all in HMOFlow.</p>
        </div>
        <div className="text-sm text-white/60">© {new Date().getFullYear()} HMOFlow</div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md shadow-card border-0">
          <CardContent className="p-8">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <Button variant="outline" className="w-full mb-4" onClick={google} disabled={busy}>
                Continue with Google
              </Button>
              <div className="relative my-4 text-xs text-muted-foreground text-center">
                <span className="bg-card px-2 relative z-10">or with email</span>
                <div className="absolute inset-x-0 top-1/2 border-t -z-0" />
              </div>

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
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handle} disabled={busy || !email || !password || !name}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </TabsContent>
            </Tabs>
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
