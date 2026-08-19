import { createFileRoute } from "@tanstack/react-router";

// Public portal feed endpoint: /api/public/feeds/<token>.<blm|xml|json>
// The token is a per-channel secret; rotate it from Settings → Portals.
export const Route = createFileRoute("/api/public/feeds/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = String((params as { file?: string }).file ?? "");
        const match = /^([a-f0-9]{32,96})\.(blm|xml|json)$/i.exec(file);
        if (!match) return new Response("Not found", { status: 404 });

        const { buildFeedForToken } = await import("@/lib/portals-core.server");
        let feed;
        try {
          feed = await buildFeedForToken(match[1].toLowerCase(), match[2].toLowerCase());
        } catch (e) {
          console.error("portal feed error", e);
          return new Response("Feed unavailable", { status: 500 });
        }
        if (!feed) return new Response("Not found", { status: 404 });

        return new Response(feed.body, {
          headers: {
            "content-type": feed.contentType,
            "cache-control": "public, max-age=300",
            "x-robots-tag": "noindex",
          },
        });
      },
    },
  },
});
