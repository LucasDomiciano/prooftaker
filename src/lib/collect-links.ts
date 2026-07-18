import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CollectLink } from "./types";

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
}

export const listCollectLinks = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }): Promise<CollectLink[]> => {
    const { getUserFromSession } = await import("./auth.server");
    const user = await getUserFromSession();
    if (!user) return [];

    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", data.projectId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!project) return [];

      const { data: links } = await supabase
        .from("collect_links")
        .select("*")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false });

      return (links ?? []).map((l) => ({
        id: l.id,
        projectId: l.project_id,
        token: l.token,
        label: l.label,
        maxUses: l.max_uses,
        usedCount: l.used_count,
        expiresAt: l.expires_at,
        createdAt: l.created_at,
      }));
    }

    const { readDb } = await import("./db.server");
    const db = await readDb();
    const project = db.projects.find(
      (p) => p.id === data.projectId && p.ownerId === user.id,
    );
    if (!project) return [];
    return (db.collectLinks ?? [])
      .filter((l) => l.projectId === data.projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

export const createCollectLink = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1),
      label: z.string().max(80).optional(),
      maxUses: z.number().int().positive().nullable().optional(),
      expiresInDays: z.number().int().positive().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Faça login." };

    const token = randomToken();
    const expiresAt =
      data.expiresInDays != null
        ? new Date(
            Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;

    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data: project } = await supabase
        .from("projects")
        .select("id, slug")
        .eq("id", data.projectId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!project) return { ok: false as const, error: "Projeto não encontrado." };

      const { data: created, error } = await supabase
        .from("collect_links")
        .insert({
          project_id: project.id,
          token,
          label: data.label?.trim() || "Link mágico",
          max_uses: data.maxUses ?? null,
          expires_at: expiresAt,
        } as never)
        .select("*")
        .single();

      if (error || !created) {
        // Fallback se migration 003 ainda não rodou: usa slug público
        if (error?.code === "42P01" || error?.message?.includes("collect_links")) {
          return {
            ok: true as const,
            link: {
              id: "legacy",
              projectId: project.id,
              token: project.slug,
              label: "Link do projeto",
              maxUses: null,
              usedCount: 0,
              expiresAt: null,
              createdAt: new Date().toISOString(),
            } satisfies CollectLink,
            path: `/coletar/${project.slug}`,
            legacy: true as const,
          };
        }
        return { ok: false as const, error: error?.message || "Falha ao criar link." };
      }

      return {
        ok: true as const,
        link: {
          id: created.id,
          projectId: created.project_id,
          token: created.token,
          label: created.label,
          maxUses: created.max_uses,
          usedCount: created.used_count,
          expiresAt: created.expires_at,
          createdAt: created.created_at,
        } satisfies CollectLink,
        path: `/c/${created.token}`,
      };
    }

    const { newId, readDb, updateDb } = await import("./db.server");
    const db = await readDb();
    const project = db.projects.find(
      (p) => p.id === data.projectId && p.ownerId === user.id,
    );
    if (!project) return { ok: false as const, error: "Projeto não encontrado." };

    const link: CollectLink = {
      id: newId("cl"),
      projectId: project.id,
      token,
      label: data.label?.trim() || "Link mágico",
      maxUses: data.maxUses ?? null,
      usedCount: 0,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    await updateDb((store) => {
      store.collectLinks = store.collectLinks ?? [];
      store.collectLinks.push(link);
    });

    return { ok: true as const, link, path: `/c/${token}` };
  });

export const resolveCollectToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(8) }))
  .handler(async ({ data }) => {
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data: link, error } = await supabase
        .from("collect_links")
        .select("*, projects(slug, name, color, logo_url, description)")
        .eq("token", data.token)
        .maybeSingle();

      if (error || !link) {
        // token pode ser slug legado
        const { getProjectBySlug } = await import("./projects");
        const project = await getProjectBySlug({ data: { slug: data.token } });
        if (project) {
          return {
            ok: true as const,
            slug: project.slug,
            project,
            magic: false as const,
          };
        }
        return { ok: false as const, error: "Link inválido ou expirado." };
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return { ok: false as const, error: "Este link expirou." };
      }
      if (link.max_uses != null && link.used_count >= link.max_uses) {
        return { ok: false as const, error: "Este link já foi usado o máximo de vezes." };
      }

      const proj = link.projects as {
        slug: string;
        name: string;
        color: string;
        logo_url?: string;
        description: string;
      };

      const { mapProjectWithCount } = await import("./mappers");
      const { resolveLogoUrl } = await import("./logos.server");
      const logoUrl = await resolveLogoUrl(proj.logo_url || link.project_id);

      return {
        ok: true as const,
        slug: proj.slug,
        token: data.token,
        magic: true as const,
        project: {
          ...mapProjectWithCount(
            {
              id: link.project_id,
              owner_id: "",
              name: proj.name,
              slug: proj.slug,
              description: proj.description,
              color: proj.color,
              logo_url: proj.logo_url,
              created_at: "",
            },
            0,
            logoUrl,
          ),
        },
      };
    }

    const { readDb } = await import("./db.server");
    const db = await readDb();
    const link = (db.collectLinks ?? []).find((l) => l.token === data.token);
    if (!link) {
      const project = db.projects.find((p) => p.slug === data.token);
      if (project) {
        return {
          ok: true as const,
          slug: project.slug,
          project: { ...project, count: 0 },
          magic: false as const,
        };
      }
      return { ok: false as const, error: "Link inválido ou expirado." };
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return { ok: false as const, error: "Este link expirou." };
    }
    if (link.maxUses != null && link.usedCount >= link.maxUses) {
      return { ok: false as const, error: "Este link já foi usado o máximo de vezes." };
    }
    const project = db.projects.find((p) => p.id === link.projectId);
    if (!project) return { ok: false as const, error: "Projeto não encontrado." };
    return {
      ok: true as const,
      slug: project.slug,
      token: data.token,
      magic: true as const,
      project: { ...project, count: 0 },
    };
  });

export async function consumeCollectLink(token: string | undefined) {
  if (!token) return;
  const { isSupabaseEnabled, getSupabaseServerClient } = await import(
    "./supabase.server"
  );
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    await supabase.rpc("consume_collect_link", { p_token: token });
    return;
  }
  const { updateDb } = await import("./db.server");
  await updateDb((store) => {
    const link = (store.collectLinks ?? []).find((l) => l.token === token);
    if (link) link.usedCount += 1;
  });
}
