import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      if (data.user) {
        const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("id", data.user.id).maybeSingle();
        setName(p?.full_name ?? ""); setPhone(p?.phone ?? "");
      }
    })();
  }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", u.user.id);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground text-sm">Manage your profile.</p></div>
      <Card className="border-0 shadow-card">
        <CardContent className="p-6 space-y-4">
          <div><Label>Email</Label><Input value={email} disabled /></div>
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
