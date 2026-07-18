import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PaidPlan } from "./plans";
import { isPaidPlan } from "./plans";
import type { Plan } from "./types";

/** Só checa env — seguro no client (sem importar o SDK Stripe). */
export function isStripeEnabled() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_STARTER),
  );
}

function priceIdFor(plan: PaidPlan) {
  if (plan === "Starter") {
    return process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_PRO;
  }
  return process.env.STRIPE_PRICE_PRO;
}

export const createPlanCheckout = createServerFn({ method: "POST" })
  .validator(z.object({ plan: z.enum(["Starter", "Pro"]) }))
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Não autenticado." };

    const key = process.env.STRIPE_SECRET_KEY;
    const priceId = priceIdFor(data.plan);
    if (!key || !priceId) {
      return {
        ok: false as const,
        error:
          "Stripe não configurado. Defina STRIPE_SECRET_KEY e STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO.",
        fallbackLocal: true as const,
      };
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(key);
    const origin = getRequestUrl().origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { userId: user.id, plan: data.plan },
      subscription_data: {
        metadata: { userId: user.id, plan: data.plan },
      },
      payment_method_types: ["card"],
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return { ok: false as const, error: "Não foi possível criar o checkout." };
    }

    return { ok: true as const, url: session.url };
  });

/** @deprecated use createPlanCheckout */
export const createProCheckout = createServerFn({ method: "POST" }).handler(
  async () => createPlanCheckout({ data: { plan: "Pro" } }),
);

export async function applyPlan(userId: string, plan: Plan) {
  const { isSupabaseEnabled, getSupabaseAdminClient, getSupabaseServerClient } =
    await import("./supabase.server");

  if (isSupabaseEnabled()) {
    const client = getSupabaseAdminClient() || getSupabaseServerClient();
    const { error } = await client
      .from("profiles")
      .update({ plan })
      .eq("id", userId);
    if (error) throw error;
    return;
  }

  const { updateDb } = await import("./db.server");
  await updateDb((store) => {
    const current = store.users.find((u) => u.id === userId);
    if (current) current.plan = plan;
  });
}

export async function applyProPlan(userId: string) {
  await applyPlan(userId, "Pro");
}

export function resolveCheckoutPlan(metadata: {
  plan?: string | null;
}): Plan {
  const plan = metadata.plan;
  if (plan && isPaidPlan(plan as Plan)) return plan as PaidPlan;
  return "Pro";
}
