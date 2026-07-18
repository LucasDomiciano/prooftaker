import type { OutboundWebhook, PublicUser } from "./types";

type WebhookEvent =
  | "testimonial.created"
  | "testimonial.approved"
  | "testimonial.rejected";

type Payload = {
  event: WebhookEvent;
  project: { id: string; name: string; slug: string };
  testimonial: {
    id: string;
    name: string;
    rating: number;
    text: string;
    status: string;
    hasVideo: boolean;
  };
  at: string;
};

async function postJson(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ProofTaker-Webhooks/1.0",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    console.error("[ProofTaker webhook]", url, e);
  } finally {
    clearTimeout(timer);
  }
}

export async function notifySlack(
  webhookUrl: string | undefined | null,
  payload: Payload,
) {
  if (!webhookUrl?.startsWith("https://hooks.slack.com/")) return;

  const stars = "★".repeat(payload.testimonial.rating);
  const text = `*Novo depoimento* em *${payload.project.name}*\n${stars} — ${payload.testimonial.name}\n>${payload.testimonial.text.slice(0, 280)}${payload.testimonial.text.length > 280 ? "…" : ""}\n_Evento: ${payload.event}_`;

  await postJson(webhookUrl, { text });
}

export async function dispatchOutboundWebhooks(
  hooks: OutboundWebhook[] | undefined | null,
  payload: Payload,
) {
  const active = (hooks ?? []).filter(
    (h) => h.active && h.url.startsWith("https://") && h.events.includes(payload.event),
  );
  await Promise.all(active.map((h) => postJson(h.url, payload)));
}

export async function notifyIntegrations(input: {
  owner: Pick<PublicUser, "slackWebhookUrl" | "outboundWebhooks"> | {
    slackWebhookUrl?: string;
    outboundWebhooks?: OutboundWebhook[];
  };
  event: WebhookEvent;
  project: { id: string; name: string; slug: string };
  testimonial: {
    id: string;
    name: string;
    rating: number;
    text: string;
    status: string;
    hasVideo: boolean;
  };
}) {
  const payload: Payload = {
    event: input.event,
    project: input.project,
    testimonial: input.testimonial,
    at: new Date().toISOString(),
  };

  await Promise.all([
    notifySlack(input.owner.slackWebhookUrl, payload),
    dispatchOutboundWebhooks(input.owner.outboundWebhooks, payload),
  ]);
}
