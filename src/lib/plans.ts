import type { Plan } from "./types";

/** Fonte única dos planos — alinhado ao mercado (Senja/Famewall/Testimonial), preços em BRL. */
export const PLANS = {
  Free: {
    id: "Free" as const,
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    testimonialLimit: 15,
    projectLimit: 1,
    removeBranding: false,
    aiTemplates: false,
    integrations: false,
    prioritySupport: false,
    highlight: false,
    blurb: "Para testar e validar prova social.",
    features: [
      "15 depoimentos (texto e vídeo)",
      "1 projeto",
      "Mural e widgets",
      "Links de coleta",
      "Marca ProofTaker no mural",
    ],
  },
  Starter: {
    id: "Starter" as const,
    name: "Starter",
    priceMonthly: 49,
    priceYearly: 470,
    testimonialLimit: null as number | null,
    projectLimit: 1,
    removeBranding: true,
    aiTemplates: true,
    integrations: false,
    prioritySupport: false,
    highlight: true,
    blurb: "Para quem já publica depoimentos no site.",
    features: [
      "Depoimentos ilimitados",
      "1 projeto",
      "Sem marca no mural",
      "Links mágicos",
      "Templates com IA",
      "Widgets",
    ],
  },
  Pro: {
    id: "Pro" as const,
    name: "Pro",
    priceMonthly: 99,
    priceYearly: 950,
    testimonialLimit: null as number | null,
    projectLimit: 5,
    removeBranding: true,
    aiTemplates: true,
    integrations: true,
    prioritySupport: true,
    highlight: false,
    blurb: "Para várias marcas, agências e times.",
    features: [
      "Tudo do Starter",
      "Até 5 projetos",
      "Slack e Zapier",
      "Webhooks",
      "Suporte prioritário",
    ],
  },
} as const;

export type PaidPlan = "Starter" | "Pro";

export function planConfig(plan: Plan) {
  return PLANS[plan] ?? PLANS.Free;
}

export function testimonialLimitFor(plan: Plan): number | null {
  return planConfig(plan).testimonialLimit;
}

export function projectLimitFor(plan: Plan): number | null {
  return planConfig(plan).projectLimit;
}

export function showBrandingFor(plan: Plan): boolean {
  return !planConfig(plan).removeBranding;
}

export function canUseIntegrations(plan: Plan): boolean {
  return planConfig(plan).integrations;
}

export function canUseAiTemplates(plan: Plan): boolean {
  return planConfig(plan).aiTemplates;
}

export function isPaidPlan(plan: Plan): plan is PaidPlan {
  return plan === "Starter" || plan === "Pro";
}

/** Compat: constantes antigas apontam para Free. */
export const FREE_TESTIMONIAL_LIMIT = PLANS.Free.testimonialLimit;
export const FREE_PROJECT_LIMIT = PLANS.Free.projectLimit;
