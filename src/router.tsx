import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega ao passar o mouse / touch — navegação quase instantânea
    defaultPreload: "intent",
    // Reusa dados da tela por 30s (antes era 0 = refetch em todo clique)
    defaultStaleTime: 30_000,
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
