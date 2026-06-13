import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { POSTS } from "@/content/posts";
import { ArrowRight, Calendar, Clock } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — property insight & market data — Estately" },
      { name: "description", content: "UK property market analysis, landlord compliance updates and product news from the Estately team." },
      { property: "og:title", content: "Estately Blog" },
      { property: "og:description", content: "Market data, compliance and product insight for UK property professionals." },
      { property: "og:url", content: "https://proptest.313test.co.uk/blog" },
    ],
    links: [{ rel: "canonical", href: "https://proptest.313test.co.uk/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [hero, ...rest] = POSTS;
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <section className="container max-w-6xl py-12 md:py-20">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4">Insight</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">The Estately Blog</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Market data, compliance and product thinking for landlords, agents and developers.
          </p>
        </div>

        <Link to="/blog/$slug" params={{ slug: hero.slug }} className="group block mb-12">
          <Card className="overflow-hidden border-0 shadow-elevated">
            <div className="grid md:grid-cols-2">
              <div className="aspect-[16/10] md:aspect-auto overflow-hidden bg-muted">
                <img src={hero.cover} alt={hero.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="eager" />
              </div>
              <CardContent className="p-8 md:p-10 flex flex-col justify-center">
                <div className="flex gap-2 mb-3">{hero.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3 group-hover:text-primary transition-colors">{hero.title}</h2>
                <p className="text-muted-foreground mb-4">{hero.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(hero.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{hero.readMins} min read</span>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-primary font-medium">Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </CardContent>
            </div>
          </Card>
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          {rest.map((p) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group">
              <Card className="overflow-hidden border-0 shadow-card h-full hover:shadow-elevated transition-shadow">
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img src={p.cover} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                </div>
                <CardContent className="p-6">
                  <div className="flex gap-2 mb-3">{p.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                  <h3 className="font-display text-xl font-bold tracking-tight mb-2 group-hover:text-primary transition-colors">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{p.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{p.readMins} min</span>
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
