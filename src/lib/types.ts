export type CollectLink = {
  id: string;
  projectId: string;
  token: string;
  label: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
};

export type OutboundWebhook = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
};

export type Plan = "Free" | "Starter" | "Pro";

export type TestimonialStatus = "pendente" | "aprovado" | "recusado";

export type Testimonial = {
  id: string;
  projectId: string;
  name: string;
  role: string;
  company: string;
  avatarUrl?: string;
  /** Texto publicado (mural/widgets) */
  text: string;
  /** Texto original do cliente */
  textOriginal: string;
  /** Versão melhorada por IA (opcional) */
  textImproved?: string;
  rating: number;
  hasVideo: boolean;
  videoPath?: string;
  status: TestimonialStatus;
  tags: string[];
  createdAt: string;
};

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  logoUrl?: string;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  company: string;
  avatarUrl: string;
  plan: Plan;
  notifyNew: boolean;
  notifyWeekly: boolean;
  notifyProduct: boolean;
  slackWebhookUrl?: string;
  outboundWebhooks?: OutboundWebhook[];
  createdAt: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  company: string;
  avatarUrl: string;
  plan: Plan;
  notifyNew: boolean;
  notifyWeekly: boolean;
  notifyProduct: boolean;
  slackWebhookUrl?: string;
  outboundWebhooks?: OutboundWebhook[];
};

export type ProjectWithCount = Project & { count: number };

/** @deprecated use plans.ts */
export { FREE_PROJECT_LIMIT, FREE_TESTIMONIAL_LIMIT } from "./plans";

export const WEBHOOK_EVENTS = [
  "testimonial.created",
  "testimonial.approved",
  "testimonial.rejected",
] as const;
