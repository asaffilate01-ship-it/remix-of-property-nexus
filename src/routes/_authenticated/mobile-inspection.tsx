import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Camera, ClipboardList, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/mobile-inspection")({
  head: () => ({ meta: [{ title: "On-site inspection — Gabley" }] }),
  component: MobileInspectionPage,
});

function MobileInspectionPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="On-site inspection" description="Quick links for inspecting a property in person — open these on your phone." />

      <div className="grid sm:grid-cols-2 gap-4">
        <Tile to="/survey" icon={Camera} title="Capture photo / video" sub="Geo-tagged evidence to the survey vault." />
        <Tile to="/work-orders" icon={Wrench} title="Raise a work order" sub="Log a defect or repair on the spot." />
        <Tile to="/inspections" icon={ClipboardList} title="Open inspections" sub="Pending and completed visit reports." />
        <Tile to="/compliance" icon={Smartphone} title="Check certificates" sub="See what's missing or expiring." />
      </div>
    </div>
  );
}

function Tile({ to, icon: Icon, title, sub }: { to: string; icon: typeof Camera; title: string; sub: string }) {
  return (
    <Card className="border-0 shadow-card hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{title}</div>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            <Button asChild size="sm" className="mt-3"><Link to={to as never}>Open</Link></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
