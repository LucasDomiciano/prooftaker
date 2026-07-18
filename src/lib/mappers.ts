import type { PublicUser, Project, ProjectWithCount, Testimonial } from "./types";

type ProfileRow = {
  id: string;
  name: string;
  company: string;
  avatar_url: string;
  plan: "Free" | "Starter" | "Pro";
  notify_new: boolean;
  notify_weekly: boolean;
  notify_product: boolean;
  slack_webhook_url?: string | null;
  outbound_webhooks?: unknown;
  created_at?: string;
};

type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  logo_url?: string | null;
  created_at: string;
};

type TestimonialRow = {
  id: string;
  project_id: string;
  name: string;
  role: string;
  company: string;
  avatar_url?: string | null;
  text: string;
  rating: number;
  has_video: boolean;
  video_path?: string | null;
  status: "pendente" | "aprovado" | "recusado";
  tags?: string[] | null;
  created_at: string;
};

export function mapProfile(row: ProfileRow, email: string): PublicUser {
  const hooks = Array.isArray(row.outbound_webhooks)
    ? (row.outbound_webhooks as PublicUser["outboundWebhooks"])
    : [];
  return {
    id: row.id,
    email,
    name: row.name,
    company: row.company,
    avatarUrl: row.avatar_url || "",
    plan: row.plan,
    notifyNew: row.notify_new,
    notifyWeekly: row.notify_weekly,
    notifyProduct: row.notify_product,
    slackWebhookUrl: row.slack_webhook_url || "",
    outboundWebhooks: hooks,
  };
}

export function mapProject(row: ProjectRow, logoUrl?: string): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    logoUrl: logoUrl || row.logo_url || undefined,
    createdAt: row.created_at,
  };
}

export function mapProjectWithCount(
  row: ProjectRow,
  count: number,
  logoUrl?: string,
): ProjectWithCount {
  return { ...mapProject(row, logoUrl), count };
}

export function mapTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    role: row.role,
    company: row.company,
    avatarUrl: row.avatar_url || undefined,
    text: row.text,
    rating: row.rating,
    hasVideo: row.has_video,
    videoPath: row.video_path || undefined,
    status: row.status,
    tags: row.tags ?? [],
    createdAt: row.created_at,
  };
}
