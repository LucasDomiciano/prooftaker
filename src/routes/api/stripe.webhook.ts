import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const key = process.env.STRIPE_SECRET_KEY;
        // Rejeita placeholders tipo "whsec_..." (muito curtos / incompletos)
        if (
          !key ||
          !secret ||
          secret.length < 20 ||
          /^whsec_\.+$/i.test(secret) ||
          secret === "whsec_..."
        ) {
          return new Response(
            "Stripe webhook not configured. Set a real STRIPE_WEBHOOK_SECRET (stripe listen or Dashboard).",
            { status: 500 },
          );
        }

        const stripe = new Stripe(key);
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing signature", { status: 400 });
        }

        const body = await request.text();
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(body, signature, secret);
        } catch (err) {
          console.error("[stripe webhook]", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const { applyPlan, resolveCheckoutPlan } = await import("@/lib/stripe");

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              const userId =
                session.metadata?.userId || session.client_reference_id;
              if (userId) {
                await applyPlan(
                  userId,
                  resolveCheckoutPlan({ plan: session.metadata?.plan }),
                );
              }
              break;
            }
            case "customer.subscription.updated": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.userId;
              if (userId && (sub.status === "active" || sub.status === "trialing")) {
                await applyPlan(
                  userId,
                  resolveCheckoutPlan({ plan: sub.metadata?.plan }),
                );
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("[stripe webhook handler]", err);
          return new Response("Handler error", { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
