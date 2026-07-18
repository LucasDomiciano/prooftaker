import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { exchangeAuthCode } from "@/lib/auth";

const searchSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (deps.error || deps.error_description) {
      throw redirect({
        to: "/login",
        search: { error: deps.error_description || deps.error || "Erro no login" },
      });
    }

    if (!deps.code) {
      throw redirect({ to: "/login" });
    }

    const result = await exchangeAuthCode({ data: { code: deps.code } });
    if (!result.ok) {
      throw redirect({
        to: "/login",
        search: { error: result.error },
      });
    }

    throw redirect({ to: "/dashboard" });
  },
  component: () => (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      Concluindo login...
    </div>
  ),
});
