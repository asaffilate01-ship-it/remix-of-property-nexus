import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Heart, Bell, Sparkles } from "lucide-react";

export function BuyerDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3 text-accent" /> Buyer portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hi{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1">Find your next home on Estately.</p>
        <div className="mt-4">
          <Button asChild className="shadow-lg shadow-primary/20"><Link to="/marketplace"><Search className="mr-2 h-4 w-4" /> Browse properties</Link></Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-card"><CardContent className="p-5"><Search className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">—</div><div className="text-xs text-muted-foreground">Saved searches</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-5"><Heart className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">—</div><div className="text-xs text-muted-foreground">Shortlist</div></CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-5"><Bell className="h-5 w-5 mb-2 text-accent" /><div className="text-2xl font-bold">—</div><div className="text-xs text-muted-foreground">Alerts</div></CardContent></Card>
      </div>
    </div>
  );
}
