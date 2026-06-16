import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Home, FileText, Wrench, CreditCard, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/tenant")({
  component: TenantPortal,
});

function TenantPortal() {
  const [loading, setLoading] = useState(true);
  const [tenancy, setTenancy] = useState<any>(null);
  const [rents, setRents] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [newIssue, setNewIssue] = useState({ title: "", description: "", priority: "medium" });
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ts } = await supabase
        .from("tenancies")
        .select("*, properties(title,address,city,postcode)")
        .eq("tenant_user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setTenancy(ts);
      if (ts) {
        const [{ data: rs }, { data: wos }, { data: dx }] = await Promise.all([
          supabase.from("rent_schedule").select("*").eq("tenancy_id", ts.id).order("due_date", { ascending: true }),
          supabase.from("work_orders").select("*").eq("tenancy_id", ts.id).order("created_at", { ascending: false }),
          supabase.from("documents").select("*").eq("tenant_user_id", user.id).order("created_at", { ascending: false }).limit(20),
        ]);
        setRents(rs ?? []);
        setWorkOrders(wos ?? []);
        setDocs(dx ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const reportIssue = async () => {
    if (!tenancy || !newIssue.title) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("work_orders").insert({
      agency_id: tenancy.agency_id,
      property_id: tenancy.property_id,
      tenancy_id: tenancy.id,
      title: newIssue.title,
      description: newIssue.description,
      priority: newIssue.priority as any,
      status: "open",
      reported_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Issue reported");
    setNewIssue({ title: "", description: "", priority: "medium" });
    const { data: wos } = await supabase.from("work_orders").select("*").eq("tenancy_id", tenancy.id).order("created_at", { ascending: false });
    setWorkOrders(wos ?? []);
  };

  const payRent = (rent: any) => setPayingId(rent.id);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!tenancy) return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">No active tenancy</h2>
      <p className="text-muted-foreground mt-2">When your agency links you to a tenancy, it'll appear here.</p>
    </div>
  );

  const nextDue = rents.find((r) => r.status !== "paid");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My tenancy</h1>
          <p className="text-sm text-muted-foreground">{tenancy.properties?.title} · {tenancy.properties?.address}, {tenancy.properties?.city}</p>
        </div>
        <Link to="/inbox"><Button variant="outline" size="sm"><MessageSquare className="h-4 w-4 mr-2" />Messages</Button></Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rent</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">£{Number(tenancy.rent_amount ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{tenancy.rent_frequency}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Next due</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{nextDue?.due_date ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{nextDue ? `£${Number(nextDue.amount).toLocaleString()}` : "All paid"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent>
            <Badge>{tenancy.status}</Badge>
            <div className="text-xs text-muted-foreground mt-1">Ends {tenancy.end_date ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Rent schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rents.length === 0 && <div className="text-sm text-muted-foreground">No rent schedule yet.</div>}
            {rents.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <div className="font-medium">£{Number(r.amount).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Due {r.due_date}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
                  {r.status !== "paid" && (
                    <Button size="sm" disabled={payingId === r.id} onClick={() => payRent(r)}>
                      {payingId === r.id ? "Opening…" : "Pay"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />Report an issue</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={newIssue.title} onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })} placeholder="Leaking tap in kitchen" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={newIssue.description} onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })} />
          </div>
          <Button onClick={reportIssue} disabled={!newIssue.title}>Submit</Button>
          <div className="pt-4 space-y-2">
            <div className="text-sm font-medium">Recent</div>
            {workOrders.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                <span>{w.title}</span>
                <Badge variant="outline">{w.status}</Badge>
              </div>
            ))}
            {workOrders.length === 0 && <div className="text-xs text-muted-foreground">No issues reported yet.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Documents</CardTitle></CardHeader>
        <CardContent>
          {docs.length === 0 && <div className="text-sm text-muted-foreground">No documents yet.</div>}
          <div className="space-y-1">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm py-1">
                <span>{d.name ?? d.title ?? "Document"}</span>
                {d.file_url && <a className="text-primary" href={d.file_url} target="_blank" rel="noreferrer">Open</a>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
