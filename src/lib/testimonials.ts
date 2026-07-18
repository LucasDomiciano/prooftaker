import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Testimonial } from "./types";
import { showBrandingFor, testimonialLimitFor } from "./plans";

export async function queryTestimonialsForUser(
  userId: string,
): Promise<Testimonial[]> {
  const { isSupabaseEnabled, getSupabaseServerClient } = await import(
    "./supabase.server"
  );

  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", userId);
    const ids = (projects ?? []).map((p) => p.id);
    if (!ids.length) return [];

    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .in("project_id", ids)
      .neq("status", "recusado")
      .order("created_at", { ascending: false });
    if (error || !data) return [];

    const { mapTestimonial } = await import("./mappers");
    const { signVideoUrl } = await import("./videos.server");
    return Promise.all(
      data.map(async (row) => {
        const t = mapTestimonial(row);
        if (t.videoPath) {
          t.videoPath = (await signVideoUrl(t.videoPath)) || t.videoPath;
        }
        return t;
      }),
    );
  }

  const { readDb } = await import("./db.server");
  const db = await readDb();
  const projectIds = new Set(
    db.projects.filter((p) => p.ownerId === userId).map((p) => p.id),
  );
  return db.testimonials
    .filter((t) => projectIds.has(t.projectId) && t.status !== "recusado")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const listTestimonials = createServerFn({ method: "GET" }).handler(
  async (): Promise<Testimonial[]> => {
    const { getUserFromSession } = await import("./auth.server");
    const user = await getUserFromSession();
    if (!user) return [];
    return queryTestimonialsForUser(user.id);
  },
);

const submitSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(2),
  role: z.string().optional(),
  company: z.string().optional(),
  text: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  authorEmail: z.string().email().optional().or(z.literal("")),
  magicToken: z.string().optional(),
  videoPath: z.string().optional(),
});

export const submitTestimonial = createServerFn({ method: "POST" })
  .validator(submitSchema)
  .handler(async ({ data }) => {
    try {
      return await runSubmitTestimonial({
        ...data,
        authorEmail: data.authorEmail || undefined,
        role: data.role || undefined,
        company: data.company || undefined,
        magicToken: data.magicToken || undefined,
        videoPath: data.videoPath || undefined,
      });
    } catch (err) {
      console.error("[submitTestimonial]", err);
      const message =
        err instanceof Error ? err.message : "Não foi possível salvar o depoimento.";
      return { ok: false as const, error: message };
    }
  });

async function runSubmitTestimonial(data: {
  slug: string;
  name: string;
  role?: string;
  company?: string;
  text: string;
  rating: number;
  authorEmail?: string;
  magicToken?: string;
  videoPath?: string;
}) {
    const {
      isSupabaseEnabled,
      getSupabasePublicClient,
      getSupabaseAdminClient,
    } = await import("./supabase.server");
    const { notifyOwnerNewTestimonial, notifyAuthorThanks } = await import(
      "./mail.server"
    );

    if (isSupabaseEnabled()) {
      // Sem cookies: coleta é pública e não depende de sessão
      const writer = getSupabasePublicClient();
      const { data: quotaRows, error: quotaError } = await writer.rpc(
        "get_collect_quota",
        { p_slug: data.slug },
      );
      const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
      if (quotaError || !quota) {
        return {
          ok: false as const,
          error: quotaError?.message
            ? `Projeto não encontrado (${quotaError.message})`
            : "Projeto não encontrado.",
        };
      }

      const limit = testimonialLimitFor(quota.plan as "Free" | "Starter" | "Pro");
      if (limit != null && quota.used >= limit) {
        return {
          ok: false as const,
          error: "Este projeto atingiu o limite de depoimentos do plano atual.",
        };
      }

      const id = crypto.randomUUID();
      let videoPath: string | null = null;
      let hasVideo = false;

      if (data.videoPath) {
        const { isSafeVideoPath } = await import("./video-upload");
        if (!isSafeVideoPath(data.videoPath)) {
          return { ok: false as const, error: "Caminho de vídeo inválido." };
        }
        videoPath = data.videoPath;
        hasVideo = true;
      }

      const original = data.text.trim();
      const { improveTestimonialCopy } = await import("./ai.server");
      const { improved } = await improveTestimonialCopy(original);

      const rowBase = {
        id,
        project_id: quota.project_id as string,
        name: data.name.trim(),
        role: data.role?.trim() || "",
        company: data.company?.trim() || "",
        text: original,
        rating: data.rating,
        has_video: hasVideo,
        video_path: videoPath,
        status: "pendente" as const,
        tags: [] as string[],
      };

      // Insert sem .select(): anon não consegue ler status "pendente" (RLS)
      let error: { message: string; code?: string } | null = null;
      {
        const res = await writer.from("testimonials").insert({
          ...rowBase,
          text_original: original,
          text_improved: improved,
        });
        error = res.error;
      }

      if (error && /text_original|text_improved|column/i.test(error.message)) {
        const res = await writer.from("testimonials").insert(rowBase);
        error = res.error;
      }

      if (error) {
        return {
          ok: false as const,
          error: error.message || "Não foi possível salvar o depoimento.",
        };
      }

      const created = {
        ...rowBase,
        text_original: original,
        text_improved: improved,
        avatar_url: null as string | null,
        created_at: new Date().toISOString().slice(0, 10),
      };

      const admin = getSupabaseAdminClient();
      let ownerEmail = "";
      if (admin) {
        const { data: authUser } = await admin.auth.admin.getUserById(
          quota.owner_id,
        );
        ownerEmail = authUser.user?.email || "";
      }

      if (ownerEmail) {
        try {
          await notifyOwnerNewTestimonial({
            ownerEmail,
            ownerName: quota.owner_name,
            projectName: quota.project_name,
            authorName: created.name,
            rating: created.rating,
            notify: quota.notify_new,
          });
        } catch (e) {
          console.error("[notify owner]", e);
        }
      }

      if (data.authorEmail) {
        try {
          await notifyAuthorThanks({
            authorEmail: data.authorEmail,
            authorName: created.name,
            projectName: quota.project_name,
          });
        } catch (e) {
          console.error("[notify author]", e);
        }
      }

      // Integrações Slack / Zapier
      try {
        const { notifyIntegrations } = await import("./integrations.server");
        const { data: profile } = await writer
          .from("profiles")
          .select("slack_webhook_url, outbound_webhooks")
          .eq("id", quota.owner_id)
          .maybeSingle();
        await notifyIntegrations({
          owner: {
            slackWebhookUrl:
              (profile as { slack_webhook_url?: string } | null)
                ?.slack_webhook_url || "",
            outboundWebhooks:
              ((profile as { outbound_webhooks?: unknown } | null)
                ?.outbound_webhooks as []) || [],
          },
          event: "testimonial.created",
          project: {
            id: quota.project_id,
            name: quota.project_name,
            slug: data.slug,
          },
          testimonial: {
            id: created.id,
            name: created.name,
            rating: created.rating,
            text: created.text,
            status: created.status,
            hasVideo: created.has_video,
          },
        });
      } catch (e) {
        console.error("[integrations]", e);
      }

      if (data.magicToken) {
        const { consumeCollectLink } = await import("./collect-links");
        await consumeCollectLink(data.magicToken);
      }

      const { mapTestimonial } = await import("./mappers");
      return { ok: true as const, testimonial: mapTestimonial(created) };
    }

    const { newId, readDb, updateDb } = await import("./db.server");
    const db = await readDb();
    const project = db.projects.find((p) => p.slug === data.slug);
    if (!project) {
      return { ok: false as const, error: "Projeto não encontrado." };
    }

    const owner = db.users.find((u) => u.id === project.ownerId);
    const ownedCount = db.testimonials.filter(
      (t) =>
        db.projects.some(
          (p) => p.id === t.projectId && p.ownerId === project.ownerId,
        ) && t.status !== "recusado",
    ).length;

    const limit = testimonialLimitFor(owner?.plan ?? "Free");
    if (limit != null && ownedCount >= limit) {
      return {
        ok: false as const,
        error: "Este projeto atingiu o limite de depoimentos do plano atual.",
      };
    }

    const id = newId("t");
    let videoPath: string | undefined;
    let hasVideo = false;

    if (data.videoPath) {
      const { isSafeVideoPath } = await import("./video-upload");
      if (!isSafeVideoPath(data.videoPath)) {
        return { ok: false as const, error: "Caminho de vídeo inválido." };
      }
      videoPath = data.videoPath;
      hasVideo = true;
    }

    const original = data.text.trim();
    const { improveTestimonialCopy } = await import("./ai.server");
    const { improved } = await improveTestimonialCopy(original);

    const testimonial: Testimonial = {
      id,
      projectId: project.id,
      name: data.name.trim(),
      role: data.role?.trim() || "",
      company: data.company?.trim() || "",
      text: original,
      textOriginal: original,
      textImproved: improved,
      rating: data.rating,
      hasVideo,
      videoPath,
      status: "pendente",
      tags: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    await updateDb((store) => {
      store.testimonials.push(testimonial);
    });

    if (owner) {
      await notifyOwnerNewTestimonial({
        ownerEmail: owner.email,
        ownerName: owner.name,
        projectName: project.name,
        authorName: testimonial.name,
        rating: testimonial.rating,
        notify: owner.notifyNew,
      });
      const { notifyIntegrations } = await import("./integrations.server");
      await notifyIntegrations({
        owner,
        event: "testimonial.created",
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
        },
        testimonial: {
          id: testimonial.id,
          name: testimonial.name,
          rating: testimonial.rating,
          text: testimonial.text,
          status: testimonial.status,
          hasVideo: testimonial.hasVideo,
        },
      });
    }

    if (data.authorEmail) {
      await notifyAuthorThanks({
        authorEmail: data.authorEmail,
        authorName: testimonial.name,
        projectName: project.name,
      });
    }

    if (data.magicToken) {
      const { consumeCollectLink } = await import("./collect-links");
      await consumeCollectLink(data.magicToken);
    }

    return { ok: true as const, testimonial };
}

const moderateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["aprovado", "recusado"]),
  /** Qual versão publicar ao aprovar */
  publishVersion: z.enum(["original", "improved"]).optional(),
});

export const moderateTestimonial = createServerFn({ method: "POST" })
  .validator(moderateSchema)
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Não autenticado." };

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data: testimonial } = await supabase
        .from("testimonials")
        .select("id, project_id, text, text_original, text_improved")
        .eq("id", data.id)
        .maybeSingle();
      if (!testimonial) {
        return { ok: false as const, error: "Depoimento não encontrado." };
      }

      const { data: project } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", testimonial.project_id)
        .maybeSingle();
      if (!project || project.owner_id !== user.id) {
        return { ok: false as const, error: "Sem permissão." };
      }

      const patch: {
        status: "aprovado" | "recusado";
        text?: string;
      } = { status: data.status };

      if (data.status === "aprovado") {
        const original = testimonial.text_original || testimonial.text;
        const improved = testimonial.text_improved || original;
        const version = data.publishVersion || "improved";
        patch.text = version === "original" ? original : improved;
      }

      const { data: updated, error } = await supabase
        .from("testimonials")
        .update(patch)
        .eq("id", data.id)
        .select("*, projects(id, name, slug)")
        .single();

      if (error) return { ok: false as const, error: error.message };

      try {
        const { notifyIntegrations } = await import("./integrations.server");
        const event =
          data.status === "aprovado"
            ? ("testimonial.approved" as const)
            : ("testimonial.rejected" as const);
        const proj = updated.projects as {
          id: string;
          name: string;
          slug: string;
        };
        await notifyIntegrations({
          owner: user,
          event,
          project: proj,
          testimonial: {
            id: updated.id,
            name: updated.name,
            rating: updated.rating,
            text: updated.text,
            status: updated.status,
            hasVideo: updated.has_video,
          },
        });
      } catch (e) {
        console.error("[integrations]", e);
      }

      return { ok: true as const };
    }

    const { readDb, updateDb } = await import("./db.server");
    const db = await readDb();
    const testimonial = db.testimonials.find((t) => t.id === data.id);
    if (!testimonial) return { ok: false as const, error: "Depoimento não encontrado." };

    const project = db.projects.find((p) => p.id === testimonial.projectId);
    if (!project || project.ownerId !== user.id) {
      return { ok: false as const, error: "Sem permissão." };
    }

    await updateDb((store) => {
      const item = store.testimonials.find((t) => t.id === data.id);
      if (!item) return;
      item.status = data.status;
      if (data.status === "aprovado") {
        const original = item.textOriginal || item.text;
        const improved = item.textImproved || original;
        const version = data.publishVersion || "improved";
        item.text = version === "original" ? original : improved;
      }
    });

    try {
      const { notifyIntegrations } = await import("./integrations.server");
      await notifyIntegrations({
        owner: user,
        event:
          data.status === "aprovado"
            ? "testimonial.approved"
            : "testimonial.rejected",
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
        },
        testimonial: {
          id: testimonial.id,
          name: testimonial.name,
          rating: testimonial.rating,
          text: testimonial.text,
          status: data.status,
          hasVideo: testimonial.hasVideo,
        },
      });
    } catch (e) {
      console.error("[integrations]", e);
    }

    return { ok: true as const };
  });

export const getEmbedData = createServerFn({ method: "GET" })
  .validator(
    z.object({
      slug: z.string().min(1),
      count: z.number().int().min(1).max(24).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!project) return null;

      const { data: owner } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", project.owner_id)
        .maybeSingle();

      const { data: approved } = await supabase
        .from("testimonials")
        .select("*")
        .eq("project_id", project.id)
        .eq("status", "aprovado")
        .order("created_at", { ascending: false })
        .limit(data.count ?? 12);

      const { mapTestimonial } = await import("./mappers");
      return {
        project: {
          name: project.name,
          slug: project.slug,
          color: project.color,
        },
        showBranding: showBrandingFor((owner?.plan as "Free" | "Starter" | "Pro") ?? "Free"),
        testimonials: (approved ?? []).map(mapTestimonial),
      };
    }

    const { readDb } = await import("./db.server");
    const db = await readDb();
    const project = db.projects.find((p) => p.slug === data.slug);
    if (!project) return null;

    const owner = db.users.find((u) => u.id === project.ownerId);
    const approved = db.testimonials
      .filter((t) => t.projectId === project.id && t.status === "aprovado")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, data.count ?? 12);

    return {
      project: {
        name: project.name,
        slug: project.slug,
        color: project.color,
      },
      showBranding: showBrandingFor(owner?.plan ?? "Free"),
      testimonials: approved,
    };
  });

export const getLandingTestimonials = createServerFn({ method: "GET" }).handler(
  async () => {
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("status", "aprovado")
        .order("created_at", { ascending: false })
        .limit(12);
      const { mapTestimonial } = await import("./mappers");
      return (data ?? []).map(mapTestimonial);
    }

    const { readDb } = await import("./db.server");
    const db = await readDb();
    return db.testimonials
      .filter((t) => t.status === "aprovado")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);
  },
);

export const improveTestimonialText = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { runImproveTestimonialById } = await import("./ai.server");
    return runImproveTestimonialById(data.id);
  });
