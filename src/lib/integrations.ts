import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { OutboundWebhook } from "./types";
import { WEBHOOK_EVENTS } from "./types";

const integrationsSchema = z.object({
  slackWebhookUrl: z.string().max(500).optional(),
  outboundWebhooks: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        events: z.array(z.string()),
        active: z.boolean(),
      }),
    )
    .max(5)
    .optional(),
});

export const updateIntegrations = createServerFn({ method: "POST" })
  .validator(integrationsSchema)
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Não autenticado." };

    const { canUseIntegrations } = await import("./plans");
    if (!canUseIntegrations(user.plan)) {
      return {
        ok: false as const,
        error: "Integrações Slack e Zapier estão disponíveis no plano Pro.",
      };
    }

    const slack = (data.slackWebhookUrl || "").trim();
    if (
      slack &&
      !slack.startsWith("https://hooks.slack.com/") &&
      !slack.startsWith("https://")
    ) {
      return { ok: false as const, error: "URL do Slack inválida." };
    }

    const hooks = (data.outboundWebhooks || []).map((h) => ({
      ...h,
      events: h.events.filter((e) =>
        (WEBHOOK_EVENTS as readonly string[]).includes(e),
      ),
    })) as OutboundWebhook[];

    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          slack_webhook_url: slack,
          outbound_webhooks: hooks,
        } as never)
        .eq("id", user.id);

      if (error) {
        if (
          error.code === "42703" ||
          error.message.toLowerCase().includes("slack_webhook")
        ) {
          return {
            ok: false as const,
            error:
              "Rode a migration 003_magic_links_integrations.sql no Supabase para ativar integrações.",
          };
        }
        return { ok: false as const, error: error.message };
      }

      const next = await getUserFromSession();
      return { ok: true as const, user: next! };
    }

    const { updateDb, toPublicUser, readDb } = await import("./db.server");
    await updateDb((store) => {
      const u = store.users.find((x) => x.id === user.id);
      if (!u) return;
      u.slackWebhookUrl = slack;
      u.outboundWebhooks = hooks;
    });
    const db = await readDb();
    const next = db.users.find((u) => u.id === user.id)!;
    return { ok: true as const, user: toPublicUser(next) };
  });
