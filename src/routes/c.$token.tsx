import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveCollectToken } from "@/lib/collect-links";

export const Route = createFileRoute("/c/$token")({
  loader: async ({ params }) => {
    const result = await resolveCollectToken({ data: { token: params.token } });
    if (!result.ok) {
      throw redirect({ to: "/" });
    }
    throw redirect({
      to: "/coletar/$slug",
      params: { slug: result.slug },
      search: result.magic && result.token ? { t: result.token } : undefined,
    });
  },
});
