import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const configuredRelease = process.env.PUBLIC_RELEASE_SHA
          ?? process.env.VERCEL_GIT_COMMIT_SHA
          ?? process.env.CF_PAGES_COMMIT_SHA
          ?? process.env.GITHUB_SHA
          ?? "unknown";
        const release = /^[a-zA-Z0-9._-]{7,64}$/.test(configuredRelease)
          ? configuredRelease
          : "unknown";
        return Response.json(
          { status: "ok", service: "gabley-web", release: release.slice(0, 64) },
          {
            headers: {
              "cache-control": "no-store",
              "x-release-sha": release.slice(0, 64),
            },
          },
        );
      },
    },
  },
});
