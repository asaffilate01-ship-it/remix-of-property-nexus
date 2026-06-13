import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Train, ShieldCheck, TrendingUp, MapPin, ArrowLeft, Home } from "lucide-react";
import { findArea, AREAS, type Area } from "@/content/areas";

export const Route = createFileRoute("/area-guides/$slug")({
  loader: ({ params }) => {
    const area = findArea(params.slug);
    if (!area) throw notFound();
    return area;
  },
  head: ({ loaderData }) => {
    const a = loaderData;
    if (!a) return { meta: [{ title: "Area guide — Estately" }] };
    const title = `${a.name} area guide — schools, transport, prices`;
    const desc = `${a.name} (${a.postcode}) area guide: avg price ${a.price}, avg rent ${a.rent}/mo, ${a.yield} yield. Schools, transport and price trends.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `https://proptest.313test.co.uk/area-guides/${a.slug}` }],
    };
  },
  component: AreaGuideDetail,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Failed: {error.message}</div>,
  notFoundComponent: () => (
    <div className="container max-w-2xl py-20 text-center">
      <h1 className="text-2xl font-bold">Area not found</h1>
      <Button asChild className="mt-4"><Link to="/area-guides">Browse all areas</Link></Button>
    </div>
  ),
});

function AreaGuideDetail() {
  const a = Route.useLoaderData() as Area;
  const peak = Math.max(...a.priceTrend.map((p) => p.value));
  const related = AREAS.filter((x) => x.slug !== a.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-5xl py-10 md:py-14">
        <Link to="/area-guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> All area guides
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <div>
            <Badge variant="outline" className="mb-3"><MapPin className="h-3 w-3 mr-1.5" /> {a.city} · {a.postcode}</Badge>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">{a.name}</h1>
          </div>
          <Badge className="bg-success/10 text-success border-success/20 gap-1"><TrendingUp className="h-3 w-3" /> +{a.trend}% YoY</Badge>
        </div>
        <p className="text-muted-foreground mt-3 max-w-2xl">{a.intro}</p>

        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          <KpiCard label="Avg. sale price" value={a.price} />
          <KpiCard label="Avg. rent /mo" value={a.rent} />
          <KpiCard label="Gross yield" value={a.yield} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="font-semibold mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Schools</div>
              <ScoreBar score={a.schools} />
              <ul className="mt-4 space-y-2 text-sm">
                {a.schoolsList.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.type}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0">{s.rating}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="font-semibold mb-3 flex items-center gap-2"><Train className="h-4 w-4" /> Transport</div>
              <ScoreBar score={a.transport} />
              <ul className="mt-4 space-y-2 text-sm">
                {a.transportList.map((t) => (
                  <li key={t.name} className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{t.mins}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Safety</div>
              <ScoreBar score={a.safety} />
              <ul className="mt-4 space-y-1.5 text-sm">
                {a.highlights.map((h) => (
                  <li key={h} className="flex gap-2"><span className="text-primary">·</span><span>{h}</span></li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-card mt-6">
          <CardContent className="p-6">
            <div className="font-semibold mb-4">5-year price trend</div>
            <div className="flex items-end gap-4 h-44">
              {a.priceTrend.map((p) => (
                <div key={p.year} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <div className="text-xs tabular-nums">£{Math.round(p.value / 1000)}k</div>
                  <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(p.value / peak) * 100}%` }} />
                  <div className="text-xs text-muted-foreground">{p.year}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-3 mt-8">
          <Button asChild size="lg" className="h-12"><Link to="/marketplace" search={{ q: a.postcode } as any}><Home className="mr-2 h-4 w-4" /> Browse properties in {a.postcode}</Link></Button>
          <Button asChild size="lg" variant="outline" className="h-12"><Link to="/valuation">Get a valuation for your home</Link></Button>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-4">Other popular guides</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {related.map((r) => (
              <Link key={r.slug} to="/area-guides/$slug" params={{ slug: r.slug }} className="group">
                <Card className="border-0 shadow-card group-hover:shadow-elevated transition-shadow h-full">
                  <CardContent className="p-4">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">Avg {r.price} · Yield {r.yield}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-display text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ score }: { score: number }) {
  const tone = score >= 85 ? "bg-success" : score >= 70 ? "bg-primary" : "bg-warning";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums w-8 text-right">{score}</span>
    </div>
  );
}
