import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Zap, Sparkles, ArrowRight, Eye, Bell } from "lucide-react";

const COPY: Record<string, { title: string; tagline: string; cta: { label: string; to: string }; icon: typeof ClipboardCheck }> = {
  inventory_clerk: {
    title: "Inventory clerk portal",
    tagline: "Schedule and complete check-in, check-out and inventory reports.",
    cta: { label: "Open work orders", to: "/work-orders" },
    icon: ClipboardCheck,
  },
  utility_provider: {
    title: "Utility provider portal",
    tagline: "Receive change-of-tenancy notifications and meter reads.",
    cta: { label: "View notifications", to: "/work-orders" },
    icon: Zap,
  },
};

export function SimpleRoleDashboard({ role, name }: { role: string; name: string }) {
  const c = COPY[role] ?? COPY.inventory_clerk;
  const Icon = c.icon;
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3 text-accent" /> {c.title}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hi{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
        <p className="text-muted-foreground mt-1">{c.tagline}</p>
      </div>

      <Tabs defaultValue="home" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="home" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Home</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-4">
          <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Icon className="h-6 w-6 text-accent" />
                <div>
                  <div className="font-semibold">Your assignments will appear here</div>
                  <div className="text-sm text-muted-foreground">Connected once an agent or landlord assigns work to you.</div>
                </div>
              </div>
              <Button asChild><Link to={c.cta.to}>{c.cta.label} <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground text-center py-8">No new notifications.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
