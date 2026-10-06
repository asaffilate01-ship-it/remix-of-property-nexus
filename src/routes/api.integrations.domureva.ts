import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { serveDomurevaBridge } from "@/lib/domureva-bridge.server";

export const Route=createFileRoute("/api/integrations/domureva")({
 server:{handlers:{POST:({request})=>serveDomurevaBridge(request)}},
});
