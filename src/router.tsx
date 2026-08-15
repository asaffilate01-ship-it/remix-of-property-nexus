import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { DefaultRouteError } from "./components/DefaultRouteError";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultRouteError,
  });

  return router;
};
