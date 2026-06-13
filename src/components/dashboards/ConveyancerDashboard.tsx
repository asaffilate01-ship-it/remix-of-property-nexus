import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, FileSignature, Clock, Sparkles, ArrowRight } from "lucide-react";

type Deal = { id: string; status: string; offer_amount: number | null; agreed_price: number | null; exchange_at: string | null; completion_at: string | null; created_at: string };

export function ConveyancerDashboard({ name }: { name: string }) {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email) return;
      const { data: contacts } = await supabase.from("contacts").select("id").eq("email", u.user.email);
      const ids = (contacts ?? []).map((c) => c.id);
      if (!ids.length) return;
      const { data } = await supabase
        .from("sales_deals")
        .select("id,status,offer_amount,agreed_price,exchange_at,completion_at,created_at")
        .or(`seller_conveyancer_id.in.(${ids.join(",")}),buyer_conveyancer_id.in.(${ids.join(",")})`)
        .order("created_at", { ascending: false });
      setDeals((data as Deal[]) ?? []);
    })();
  }, []);

  const active = deals.filter((d) => !["completed", "fallen_through"].includes(d.status)).length;
  const exchanged = deals.filter((d) => d.exchange_at && !d.completion_at).length;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3 text-accent" /> Conveyancer portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hi{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1">Your active matters and milestones.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-card"><CardContent className="p-5"><Scale className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">{active}</div><div className="text-xs text-muted-foreground">Active matters</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-5"><FileSignature className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">{exchanged}</div><div className="text-xs text-muted-foreground">Exchanged, awaiting completion</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-5"><Clock className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">{deals.length}</div><div className="text-xs text-muted-foreground">Total matters</div></CardContent></Card>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Matters</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/sales">Sales pipeline <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          {deals.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No matters assigned to you yet.</div>
          ) : (
            <div className="divide-y">
              {deals.slice(0, 10).map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">£{Number(d.agreed_price ?? d.offer_amount ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Opened {new Date(d.created_at).toLocaleDateString("en-GB")}</div>
                  </div>
                  <Badge variant="outline">{d.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
