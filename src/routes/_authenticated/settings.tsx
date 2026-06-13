import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { listPermissions, updatePermission } from "@/lib/branches.functions";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

const CAP_LABEL: Record<string, string> = {
  manage_listings: "Manage listings",
  view_financials: "View financials",
  edit_compliance: "Edit compliance",
  invite_users: "Invite users",
  manage_branches: "Manage branches",
  decide_referencing: "Decide referencing",
  send_alerts: "Send alerts",
};

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

  const saveProfile = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", u.user.id);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground text-sm">Manage your profile and agency permissions.</p></div>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="permissions">Roles & permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6 space-y-4 max-w-lg">
              <div><Label>Email</Label><Input value={email} disabled /></div>
              <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <Button onClick={saveProfile}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PermissionsMatrix() {
  const fetchPerms = useServerFn(listPermissions);
  const update = useServerFn(updatePermission);
  const [roles, setRoles] = useState<readonly string[]>([]);
  const [caps, setCaps] = useState<readonly string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    fetchPerms({}).then((r) => {
      setRoles(r.roles); setCaps(r.capabilities);
      setMatrix(r.matrix); setAgencyId(r.agencyId);
    }).finally(() => setLoading(false));
  }, [fetchPerms]);

  const toggle = async (role: string, cap: string, allowed: boolean) => {
    setMatrix((curr) => {
      const next = { ...curr };
      const list = new Set(next[role] ?? []);
      if (allowed) list.add(cap); else list.delete(cap);
      next[role] = Array.from(list);
      return next;
    });
    try { await update({ data: { role, capability: cap, allowed } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  };

  if (loading) return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
  if (!agencyId) return <Card><CardContent className="p-6 text-sm text-muted-foreground">No agency on this account.</CardContent></Card>;

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-primary" />
          <div><div className="font-semibold">Roles & permissions</div><div className="text-xs text-muted-foreground">Only the agency owner can change these. Defaults are applied on first load.</div></div>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="text-left py-2 pr-4">Capability</th>
                {roles.map((r) => <th key={r} className="text-center py-2 px-2 capitalize">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {caps.map((cap) => (
                <tr key={cap} className="border-t">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">{CAP_LABEL[cap] ?? cap}</div>
                    <div className="text-[11px] text-muted-foreground">{cap}</div>
                  </td>
                  {roles.map((role) => {
                    const allowed = matrix[role]?.includes(cap) ?? false;
                    const disabled = role === "owner"; // Owner is always all-powerful
                    return (
                      <td key={role} className="py-2.5 px-2 text-center">
                        <Switch
                          checked={role === "owner" ? true : allowed}
                          disabled={disabled}
                          onCheckedChange={(v) => toggle(role, cap, v)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">Owner: full access</Badge>
          <Badge variant="outline">Changes save automatically</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
