import { createFileRoute, redirect } from "@tanstack/react-router";

// Pricing lives at /business today; /pricing is the friendlier URL.
export const Route = createFileRoute("/pricing")({
  beforeLoad: () => { throw redirect({ to: "/business" }); },
});
