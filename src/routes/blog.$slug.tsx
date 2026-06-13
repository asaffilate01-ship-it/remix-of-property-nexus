import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPost, POSTS } from "@/content/posts";
import { ArrowLeft, Calendar, Clock, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SITE = "https://proptest.313test.co.uk";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ params, loaderData }) => {
    const p = loaderData;
    if (!p) return { meta: [{ title: "Article not found — Estately" }] };
    const url = `${SITE}/blog/${params.slug}`;
    return {
      meta: [
        { title: `${p.title} — Estately` },
        { name: "description", content: p.excerpt },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: p.cover },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: p.title },
        { name: "twitter:description", content: p.excerpt },
        { name: "twitter:image", content: p.cover },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: p.title,
          description: p.excerpt,
          image: p.cover,
          datePublished: p.date,
          author: { "@type": "Person", name: p.author },
        }),
      }],
    };
  },
  notFoundComponent: () => (
    <div className="container max-w-3xl py-24 text-center">
      <h1 className="font-display text-3xl font-bold mb-3">Article not found</h1>
      <p className="text-muted-foreground mb-6">It may have moved or been retired.</p>
      <Button asChild><Link to="/blog">Back to blog</Link></Button>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="container max-w-3xl py-24 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Something went wrong</h1>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  ),
  component: PostPage,
});

function ShareBar({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE}/blog/${slug}`;
  const enc = encodeURIComponent;
  const links = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(url)}` },
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 py-6 border-y my-10">
      <span className="text-sm font-medium text-muted-foreground mr-2">Share</span>
      {links.map((l) => (
        <Button key={l.label} asChild variant="outline" size="sm">
          <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
        </Button>
      ))}
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}

function PostPage() {
  const p = Route.useLoaderData();
  const related = POSTS.filter((x) => x.slug !== p.slug).slice(0, 2);
  return (
    <article className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-3xl py-10 md:py-16">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>

        <div className="flex gap-2 mb-4">{p.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">{p.title}</h1>
        <p className="text-lg text-muted-foreground mb-6">{p.excerpt}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
          <span className="font-medium text-foreground">{p.author}</span>
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{p.readMins} min read</span>
        </div>

        <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-muted shadow-elevated mb-10">
          <img src={p.cover} alt={p.title} className="h-full w-full object-cover" />
        </div>

        <div className="prose prose-lg max-w-none space-y-5 text-foreground/90 leading-relaxed">
          {p.body.map((para, i) => <p key={i} className="text-base md:text-lg">{para}</p>)}
        </div>

        <ShareBar title={p.title} slug={p.slug} />

        {related.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-bold mb-4">Keep reading</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link key={r.slug} to="/blog/$slug" params={{ slug: r.slug }} className="group block rounded-xl overflow-hidden border bg-card hover:shadow-card transition-shadow">
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    <img src={r.cover} alt={r.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
