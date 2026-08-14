import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { LOCATIONS } from "@/content/locations";
import { AREAS } from "@/content/areas";
import { POSTS } from "@/content/posts";

const BASE_URL = "https://estate-elevate-hq.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_PATHS: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/marketplace", changefreq: "hourly", priority: "0.9" },
  { path: "/property-for-sale", changefreq: "daily", priority: "0.9" },
  { path: "/property-to-rent", changefreq: "daily", priority: "0.9" },
  { path: "/agencies", changefreq: "weekly", priority: "0.7" },
  { path: "/area-guides", changefreq: "weekly", priority: "0.6" },
  { path: "/blog", changefreq: "weekly", priority: "0.6" },
  { path: "/platform", changefreq: "monthly", priority: "0.7" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/for-agents", changefreq: "monthly", priority: "0.8" },
  { path: "/for-landlords", changefreq: "monthly", priority: "0.8" },
  { path: "/business", changefreq: "monthly", priority: "0.6" },
  { path: "/referencing", changefreq: "monthly", priority: "0.5" },
  { path: "/mortgage", changefreq: "monthly", priority: "0.5" },
  { path: "/valuation", changefreq: "monthly", priority: "0.6" },
  { path: "/about", changefreq: "yearly", priority: "0.4" },
  { path: "/contact", changefreq: "yearly", priority: "0.4" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
  { path: "/cookies", changefreq: "yearly", priority: "0.2" },
  { path: "/complaints", changefreq: "yearly", priority: "0.2" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_PATHS];

        for (const l of LOCATIONS) {
          entries.push({ path: `/property-for-sale/${l.slug}`, changefreq: "daily", priority: "0.8" });
          entries.push({ path: `/property-to-rent/${l.slug}`, changefreq: "daily", priority: "0.8" });
        }
        for (const a of AREAS) entries.push({ path: `/area-guides/${a.slug}`, changefreq: "monthly", priority: "0.5" });
        for (const p of POSTS) entries.push({ path: `/blog/${p.slug}`, changefreq: "monthly", priority: "0.5" });
        for (const m of ["sales", "lettings", "hmo", "commercial"]) {
          entries.push({ path: `/modules/${m}`, changefreq: "monthly", priority: "0.6" });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [{ data: listings }, { data: agencies }] = await Promise.all([
            supabaseAdmin
              .from("listings")
              .select("slug")
              .in("status", ["published", "under_offer", "let_agreed"])
              .eq("marketplace_publish", true)
              .limit(5000),
            supabaseAdmin.from("agencies").select("slug").eq("is_published", true).limit(2000),
          ]);
          for (const l of listings ?? []) {
            if (l.slug) entries.push({ path: `/marketplace/${l.slug}`, changefreq: "daily", priority: "0.7" });
          }
          for (const a of agencies ?? []) {
            if (a.slug) entries.push({ path: `/agencies/${a.slug}`, changefreq: "weekly", priority: "0.6" });
          }
        } catch {
          // database unavailable — still serve the static portion of the sitemap
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
