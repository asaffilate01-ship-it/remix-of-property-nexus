import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, GraduationCap, Train, ShieldCheck, TrendingUp, MapPin, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/area-guides")({
  head: () => ({
    meta: [
      { title: "UK area guides — schools, transport, prices — Estately" },
      { name: "description", content: "In-depth area guides for every UK postcode: school ratings, transport, crime, demographics, sold prices and rental yields." },
      { property: "og:title", content: "UK area guides — Estately" },
      { property: "og:description", content: "Schools, transport, crime and price trends — for every UK postcode." },
    ],
    links: [{ rel: "canonical", href: "https://proptest.313test.co.uk/area-guides" }],
  }),
  component: AreaGuidesPage,
});

const AREAS = [
  { slug: "marylebone-w1", name: "Marylebone, W1", price: "£1.92M", rent: "£3,400", yield: "2.1%", schools: 92, transport: 98, safety: 84, trend: +6.2 },
  { slug: "chorlton-m21", name: "Chorlton, M21", price: "£452K", rent: "£1,650", yield: "4.4%", schools: 88, transport: 76, safety: 78, trend: +4.1 },
  { slug: "clifton-bs8", name: "Clifton, BS8", price: "£685K", rent: "£2,100", yield: "3.7%", schools: 91, transport: 82, safety: 86, trend: +5.0 },
  { slug: "jesmond-ne2", name: "Jesmond, NE2", price: "£385K", rent: "£1,450", yield: "4.5%", schools: 86, transport: 79, safety: 81, trend: +3.4 },
  { slug: "kelvinbridge-g12", name: "Kelvinbridge, G12", price: "£298K", rent: "£1,250", yield: "5.0%", schools: 84, transport: 88, safety: 75, trend: +4.8 },
  { slug: "didsbury-m20", name: "Didsbury, M20", price: "£525K", rent: "£1,750", yield: "4.0%", schools: 90, transport: 80, safety: 82, trend: +4.5 },
];

function AreaGuidesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <section className="container max-w-6xl py-12 md:py-20">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4"><MapPin className="h-3 w-3 mr-1.5" /> 30,000+ UK neighbourhoods</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Know the area before you move</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Schools, crime, transport, sold prices and rental yields — sourced from ONS, DfE and Land Registry.</p>
        </div>

        <Card className="border-0 shadow-elevated max-w-2xl mx-auto">
          <CardContent className="p-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Postcode, town or borough" className="pl-9 h-12" />
            </div>
            <Button size="lg" className="h-12">Explore</Button>
          </CardContent>
        </Card>
      </section>

      <section className="container max-w-6xl pb-20">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl font-bold font-display">Popular guides</h2>
          <Button variant="ghost" size="sm">See all areas <ArrowRight className="ml-1 h-3 w-3" /></Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AREAS.map((a) => (
            <Link key={a.slug} to="/area-guides" className="group">
              <Card className="border-0 shadow-card h-full transition-shadow group-hover:shadow-elevated">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-lg">{a.name}</div>
                      <div className="text-xs text-success flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" /> +{a.trend}% YoY</div>
                    </div>
                    <Badge variant="outline" className="shrink-0">Yield {a.yield}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><div className="text-xs text-muted-foreground">Avg. price</div><div className="font-semibold">{a.price}</div></div>
                    <div><div className="text-xs text-muted-foreground">Avg. rent /mo</div><div className="font-semibold">{a.rent}</div></div>
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <ScoreRow icon={<GraduationCap className="h-3.5 w-3.5" />} label="Schools" score={a.schools} />
                    <ScoreRow icon={<Train className="h-3.5 w-3.5" />} label="Transport" score={a.transport} />
                    <ScoreRow icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Safety" score={a.safety} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScoreRow({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
  const tone = score >= 85 ? "bg-success" : score >= 70 ? "bg-primary" : "bg-warning";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5 w-20 shrink-0">{icon} {label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
      <span className="font-semibold w-6 text-right">{score}</span>
    </div>
  );
}
