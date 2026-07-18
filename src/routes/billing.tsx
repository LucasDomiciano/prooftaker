import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CreditCard, QrCode } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { upgradeToPlan } from "@/lib/profile";
import { createPlanCheckout } from "@/lib/stripe";
import { loadBillingPage } from "@/lib/app-loaders";
import { PLANS, type PaidPlan } from "@/lib/plans";
import type { Plan } from "@/lib/types";

export const Route = createFileRoute("/billing")({
  validateSearch: (search: Record<string, unknown>) => ({
    success:
      search.success === "1" || search.success === true || search.success === 1
        ? ("1" as const)
        : undefined,
    canceled:
      search.canceled === "1" ||
      search.canceled === true ||
      search.canceled === 1
        ? ("1" as const)
        : undefined,
  }),
  loader: async () => {
    const data = await loadBillingPage();
    if (!data?.user) {
      throw new Error("Sessão inválida. Faça login novamente.");
    }
    return { user: data.user, summary: data.billing };
  },
  head: () => ({ meta: [{ title: "Plano & Cobrança · ProofTaker" }] }),
  component: Billing,
});

function Billing() {
  const { user, summary } = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const [loading, setLoading] = useState<PaidPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const plan = (summary?.plan ?? user.plan) as Plan;
  const used = summary?.used ?? 0;
  const limit = summary?.limit;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const stripeEnabled = Boolean(summary?.stripeEnabled);

  useEffect(() => {
    if (search.success === "1" || search.success === true) {
      setMessage("Pagamento recebido! Seu plano será ativado em instantes.");
      void router.invalidate();
    } else if (search.canceled === "1" || search.canceled === true) {
      setMessage("Checkout cancelado. Você continua no plano atual.");
    }
  }, [search.success, search.canceled, router]);

  const subscribe = async (target: PaidPlan) => {
    setLoading(target);
    setMessage(null);
    try {
      if (stripeEnabled) {
        const checkout = await createPlanCheckout({ data: { plan: target } });
        if (!checkout.ok) {
          setMessage(checkout.error);
          return;
        }
        window.location.href = checkout.url;
        return;
      }

      const result = await upgradeToPlan({ data: { plan: target } });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`Plano ${target} ativado (sem Stripe configurado).`);
      await router.invalidate();
    } finally {
      setLoading(null);
    }
  };

  const tiers = [PLANS.Free, PLANS.Starter, PLANS.Pro] as const;

  return (
    <AppShell title="Plano & Cobrança" user={user}>
      <div className="mb-8 rounded-2xl border bg-brand-soft p-6 shadow-card md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Seu plano atual
            </p>
            <p className="mt-2 font-display text-2xl font-bold">{plan}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {limit
                ? `${used} de ${limit} depoimentos usados`
                : `${used} depoimentos · ilimitado`}
              {summary?.projectLimit != null
                ? ` · ${summary.projectCount ?? 0}/${summary.projectLimit} projetos`
                : summary?.projectCount != null
                  ? ` · ${summary.projectCount} projetos`
                  : ""}
            </p>
          </div>
          {limit && (
            <div className="w-full max-w-xs">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Uso</span>
                <span className="font-medium">
                  {used} / {limit}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = plan === tier.id;
          const isPaid = tier.id !== "Free";
          const canUpgrade =
            isPaid &&
            !isCurrent &&
            (plan === "Free" || (plan === "Starter" && tier.id === "Pro"));

          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl border bg-card p-6 shadow-card ${
                tier.highlight ? "border-2 border-primary shadow-glow" : ""
              }`}
            >
              {tier.highlight ? (
                <span className="absolute -top-3 right-5 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Mais escolhido
                </span>
              ) : null}
              <p className="text-sm font-medium text-muted-foreground">{tier.name}</p>
              <p className="mt-2 font-display text-4xl font-bold">
                {tier.priceMonthly === 0 ? (
                  "R$ 0"
                ) : (
                  <>
                    R$ {tier.priceMonthly}
                    <span className="text-lg font-normal text-muted-foreground">
                      /mês
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tier.priceYearly > 0
                  ? `ou R$ ${tier.priceYearly}/ano`
                  : "para sempre"}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{tier.blurb}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              {tier.id === "Free" ? (
                <Button variant="outline" className="mt-8 w-full" disabled={isCurrent}>
                  {isCurrent ? "Plano atual" : "Downgrade indisponível"}
                </Button>
              ) : (
                <Button
                  className={`mt-8 w-full ${tier.highlight ? "bg-brand-gradient" : ""}`}
                  variant={tier.highlight ? "default" : "outline"}
                  disabled={isCurrent || loading !== null || !canUpgrade}
                  onClick={() => void subscribe(tier.id)}
                >
                  {isCurrent
                    ? "Plano atual"
                    : loading === tier.id
                      ? "Processando..."
                      : plan === "Pro" && tier.id === "Starter"
                        ? "Já no Pro"
                        : stripeEnabled
                          ? `Assinar ${tier.name}`
                          : `Ativar ${tier.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CreditCard className="size-3.5" /> Cartão
        </span>
        <span className="inline-flex items-center gap-1">
          <QrCode className="size-3.5" /> Pix*
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        *Pix requer Stripe Brasil com Pix habilitado
      </p>

      {message && (
        <p className="mt-6 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <div className="mt-10 rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Histórico de cobranças</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          {stripeEnabled
            ? "Após o primeiro pagamento, as faturas aparecem no painel Stripe."
            : "Nenhuma cobrança realizada até o momento."}
        </p>
      </div>
    </AppShell>
  );
}
