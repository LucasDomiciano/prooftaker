import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Project, ProjectWithCount } from "./types";
import { projectLimitFor } from "./plans";

function withCount(
  project: Project,
  testimonials: { projectId: string; status: string }[],
): ProjectWithCount {
  return {
    ...project,
    count: testimonials.filter(
      (t) => t.projectId === project.id && t.status !== "recusado",
    ).length,
  };
}

async function attachLogo(
  project: ProjectWithCount,
): Promise<ProjectWithCount> {
  const { resolveLogoUrl } = await import("./logos.server");
  const logoUrl =
    (await resolveLogoUrl(project.logoUrl)) ||
    (await resolveLogoUrl(project.id));
  return logoUrl ? { ...project, logoUrl } : { ...project, logoUrl: undefined };
}

async function attachLogos(
  projects: ProjectWithCount[],
): Promise<ProjectWithCount[]> {
  if (!projects.length) return projects;
  const { resolveLogoUrls } = await import("./logos.server");
  const keys = projects.flatMap((p) =>
    p.logoUrl ? [p.logoUrl, p.id] : [p.id],
  );
  const urls = await resolveLogoUrls(keys);
  return projects.map((p) => {
    const logoUrl = (p.logoUrl && urls.get(p.logoUrl)) || urls.get(p.id);
    return logoUrl ? { ...p, logoUrl } : { ...p, logoUrl: undefined };
  });
}

const slugSchema = z
  .string()
  .min(2)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function parseProjectFields(formData: FormData) {
  const logo = formData.get("logo");
  return {
    id: String(formData.get("id") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    slug: String(formData.get("slug") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    color: String(formData.get("color") || "").trim(),
    removeLogo: String(formData.get("removeLogo") || "") === "1",
    logo: logo instanceof File && logo.size > 0 ? logo : null,
  };
}

export async function queryProjectsForUser(
  userId: string,
): Promise<ProjectWithCount[]> {
  const { isSupabaseEnabled, getSupabaseServerClient } = await import(
    "./supabase.server"
  );

  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error || !projects) return [];

    const { mapProjectWithCount } = await import("./mappers");
    const ids = projects.map((p) => p.id);
    const { data: testimonials } = await supabase
      .from("testimonials")
      .select("project_id, status")
      .in(
        "project_id",
        ids.length ? ids : ["00000000-0000-0000-0000-000000000000"],
      );

    const mapped = projects.map((p) => {
      const count = (testimonials ?? []).filter(
        (t) => t.project_id === p.id && t.status !== "recusado",
      ).length;
      return mapProjectWithCount(p, count);
    });
    return attachLogos(mapped);
  }

  const { readDb } = await import("./db.server");
  const db = await readDb();
  const list = db.projects
    .filter((p) => p.ownerId === userId)
    .map((p) => withCount(p, db.testimonials))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return attachLogos(list);
}

export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectWithCount[]> => {
    const { getUserFromSession } = await import("./auth.server");
    const user = await getUserFromSession();
    if (!user) return [];
    return queryProjectsForUser(user.id);
  },
);

export const getProjectById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    const user = await getUserFromSession();
    if (!user) return null;

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", data.id)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!project) return null;
      const { mapProjectWithCount } = await import("./mappers");
      const { count } = await supabase
        .from("testimonials")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .neq("status", "recusado");
      return attachLogo(mapProjectWithCount(project, count ?? 0));
    }

    const { readDb } = await import("./db.server");
    const db = await readDb();
    const project = db.projects.find(
      (p) => p.id === data.id && p.ownerId === user.id,
    );
    if (!project) return null;
    return attachLogo(withCount(project, db.testimonials));
  });

export const getProjectBySlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
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
      const { mapProjectWithCount } = await import("./mappers");
      const { count } = await supabase
        .from("testimonials")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .neq("status", "recusado");
      return attachLogo(mapProjectWithCount(project, count ?? 0));
    }

    const { readDb } = await import("./db.server");
    const db = await readDb();
    const project = db.projects.find((p) => p.slug === data.slug);
    if (!project) return null;
    return attachLogo(withCount(project, db.testimonials));
  });

const createSchema = z.object({
  name: z.string().min(2),
  slug: slugSchema,
  description: z.string().optional(),
  color: z.string().min(3),
});

export const createProject = createServerFn({ method: "POST" })
  .validator((formData: FormData) => {
    const parsed = parseProjectFields(formData);
    const base = createSchema.parse({
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      color: parsed.color,
    });
    return { ...base, logo: parsed.logo };
  })
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Faça login para continuar." };

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        name: user.name,
        company: user.company || "",
      });
      if (profileError) {
        return {
          ok: false as const,
          error:
            "Não foi possível preparar seu perfil. Tente sair e entrar de novo.",
        };
      }

      const { count, error: countError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

      if (countError) {
        return {
          ok: false as const,
          error: "Não foi possível verificar seus projetos. Tente novamente.",
        };
      }

      const pLimit = projectLimitFor(user.plan);
      if (pLimit != null && (count ?? 0) >= pLimit) {
        return {
          ok: false as const,
          error: `Seu plano permite até ${pLimit} projeto(s). Faça upgrade em Planos & Cobrança.`,
        };
      }

      const { data: created, error } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          name: data.name.trim(),
          slug: data.slug,
          description: data.description?.trim() || "",
          color: data.color,
        })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return {
            ok: false as const,
            error: "Este link já está em uso. Escolha outro.",
          };
        }
        if (
          error.code === "42501" ||
          error.message.toLowerCase().includes("row-level security")
        ) {
          return {
            ok: false as const,
            error: "Sessão expirada ou sem permissão. Saia e entre novamente.",
          };
        }
        if (error.code === "23503") {
          return {
            ok: false as const,
            error: "Perfil incompleto no banco. Saia e entre novamente.",
          };
        }
        return { ok: false as const, error: error.message };
      }

      let logoPath: string | undefined;
      if (data.logo) {
        const { saveProjectLogo } = await import("./logos.server");
        const saved = await saveProjectLogo(data.logo, created.id);
        if (!saved.ok) {
          return { ok: false as const, error: saved.error };
        }
        logoPath = saved.path;
        // Coluna logo_url é opcional até rodar migration 002
        const { error: logoColErr } = await supabase
          .from("projects")
          .update({ logo_url: logoPath } as never)
          .eq("id", created.id);
        if (logoColErr && !logoColErr.message.includes("logo_url")) {
          console.warn(logoColErr.message);
        }
      }

      const { mapProjectWithCount } = await import("./mappers");
      return {
        ok: true as const,
        project: await attachLogo(
          mapProjectWithCount(
            { ...created, logo_url: logoPath || "" },
            0,
            logoPath,
          ),
        ),
      };
    }

    const { newId, readDb, updateDb } = await import("./db.server");
    const db = await readDb();
    const owned = db.projects.filter((p) => p.ownerId === user.id);
    const pLimit = projectLimitFor(user.plan);
    if (pLimit != null && owned.length >= pLimit) {
      return {
        ok: false as const,
        error: `Seu plano permite até ${pLimit} projeto(s). Faça upgrade em Planos & Cobrança.`,
      };
    }
    if (db.projects.some((p) => p.slug === data.slug)) {
      return { ok: false as const, error: "Este link já está em uso." };
    }

    const id = newId("p");
    let logoUrl: string | undefined;
    if (data.logo) {
      const { saveProjectLogo } = await import("./logos.server");
      const saved = await saveProjectLogo(data.logo, id);
      if (!saved.ok) return { ok: false as const, error: saved.error };
      logoUrl = saved.path;
    }

    const project: Project = {
      id,
      ownerId: user.id,
      name: data.name.trim(),
      slug: data.slug,
      description: data.description?.trim() || "",
      color: data.color,
      logoUrl,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    await updateDb((store) => {
      store.projects.push(project);
    });

    return {
      ok: true as const,
      project: await attachLogo(withCount(project, [])),
    };
  });

export const updateProject = createServerFn({ method: "POST" })
  .validator((formData: FormData) => {
    const parsed = parseProjectFields(formData);
    if (!parsed.id) throw new Error("Projeto inválido.");
    const base = createSchema.parse({
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      color: parsed.color,
    });
    return {
      ...base,
      id: parsed.id,
      logo: parsed.logo,
      removeLogo: parsed.removeLogo,
    };
  })
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Faça login para continuar." };

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { data: existing } = await supabase
        .from("projects")
        .select("*")
        .eq("id", data.id)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!existing) {
        return { ok: false as const, error: "Projeto não encontrado." };
      }

      let logoPath =
        (existing as { logo_url?: string }).logo_url || undefined;

      if (data.removeLogo) {
        const { deleteProjectLogo } = await import("./logos.server");
        await deleteProjectLogo(existing.id, logoPath);
        logoPath = "";
      }

      if (data.logo) {
        const { saveProjectLogo } = await import("./logos.server");
        const saved = await saveProjectLogo(data.logo, existing.id);
        if (!saved.ok) return { ok: false as const, error: saved.error };
        logoPath = saved.path;
      }

      const patch: Record<string, string> = {
        name: data.name.trim(),
        slug: data.slug,
        description: data.description?.trim() || "",
        color: data.color,
      };
      if (data.logo || data.removeLogo) {
        patch.logo_url = logoPath || "";
      }

      const { data: updated, error } = await supabase
        .from("projects")
        .update(patch as never)
        .eq("id", data.id)
        .eq("owner_id", user.id)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return {
            ok: false as const,
            error: "Este link já está em uso. Escolha outro.",
          };
        }
        // Se logo_url ainda não existe no schema, salva o resto sem o campo
        if (
          error.message.toLowerCase().includes("logo_url") ||
          error.code === "42703"
        ) {
          const { logo_url: _ignored, ...rest } = patch;
          const retry = await supabase
            .from("projects")
            .update(rest as never)
            .eq("id", data.id)
            .eq("owner_id", user.id)
            .select("*")
            .single();
          if (retry.error) {
            return { ok: false as const, error: retry.error.message };
          }
          const { mapProjectWithCount } = await import("./mappers");
          const { count } = await supabase
            .from("testimonials")
            .select("*", { count: "exact", head: true })
            .eq("project_id", data.id)
            .neq("status", "recusado");
          return {
            ok: true as const,
            project: await attachLogo(
              mapProjectWithCount(retry.data, count ?? 0, logoPath || undefined),
            ),
          };
        }
        return { ok: false as const, error: error.message };
      }

      const { mapProjectWithCount } = await import("./mappers");
      const { count } = await supabase
        .from("testimonials")
        .select("*", { count: "exact", head: true })
        .eq("project_id", data.id)
        .neq("status", "recusado");
      return {
        ok: true as const,
        project: await attachLogo(
          mapProjectWithCount(updated, count ?? 0, logoPath || undefined),
        ),
      };
    }

    const { readDb, updateDb } = await import("./db.server");
    const db = await readDb();
    const project = db.projects.find(
      (p) => p.id === data.id && p.ownerId === user.id,
    );
    if (!project) {
      return { ok: false as const, error: "Projeto não encontrado." };
    }
    if (
      db.projects.some((p) => p.slug === data.slug && p.id !== data.id)
    ) {
      return { ok: false as const, error: "Este link já está em uso." };
    }

    let logoUrl = project.logoUrl;
    if (data.removeLogo) {
      const { deleteProjectLogo } = await import("./logos.server");
      await deleteProjectLogo(project.id, logoUrl);
      logoUrl = undefined;
    }
    if (data.logo) {
      const { saveProjectLogo } = await import("./logos.server");
      const saved = await saveProjectLogo(data.logo, project.id);
      if (!saved.ok) return { ok: false as const, error: saved.error };
      logoUrl = saved.path;
    }

    await updateDb((store) => {
      const idx = store.projects.findIndex((p) => p.id === data.id);
      if (idx < 0) return;
      store.projects[idx] = {
        ...store.projects[idx],
        name: data.name.trim(),
        slug: data.slug,
        description: data.description?.trim() || "",
        color: data.color,
        logoUrl,
      };
    });

    const fresh = (await readDb()).projects.find((p) => p.id === data.id)!;
    return {
      ok: true as const,
      project: await attachLogo(withCount(fresh, (await readDb()).testimonials)),
    };
  });
