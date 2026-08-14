import { createFileRoute } from "@tanstack/react-router";
import { getServerSiteUrl } from "@/lib/site-url.server";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const site = getServerSiteUrl();
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /auth",
          "Disallow: /dashboard",
          "Disallow: /settings",
          "Disallow: /visit/",
          "Disallow: /sign/",
          "Disallow: /api/",
          "",
          `Sitemap: ${site}/sitemap.xml`,
          "",
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
