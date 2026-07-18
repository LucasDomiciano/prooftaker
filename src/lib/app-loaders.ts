import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Loaders de página em 1 round-trip HTTP.
 * Consultas diretas no servidor (sem server-fn aninhada).
 */

async function requireSessionUser() {
  const { getUserFromSession } = await import("./auth.server");
  const user = await getUserFromSession();
  if (!user) throw redirect({ to: "/login" });
  return user;
}

export const loadDashboardPage = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireSessionUser();
    const { queryProjectsForUser } = await import("./projects");
    const { queryTestimonialsForUser } = await import("./testimonials");
    const { queryBillingForUser } = await import("./profile");
    const [projects, testimonials, billing] = await Promise.all([
      queryProjectsForUser(user.id),
      queryTestimonialsForUser(user.id),
      queryBillingForUser(user),
    ]);
    return { user, projects, testimonials, billing };
  },
);

export const loadProjetosPage = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireSessionUser();
    const { queryProjectsForUser } = await import("./projects");
    const { queryBillingForUser } = await import("./profile");
    const [projects, billing] = await Promise.all([
      queryProjectsForUser(user.id),
      queryBillingForUser(user),
    ]);
    return { user, projects, billing };
  },
);

export const loadWidgetsPage = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireSessionUser();
    const { queryProjectsForUser } = await import("./projects");
    const { queryTestimonialsForUser } = await import("./testimonials");
    const [projects, testimonials] = await Promise.all([
      queryProjectsForUser(user.id),
      queryTestimonialsForUser(user.id),
    ]);
    return { user, projects, testimonials };
  },
);

export const loadBillingPage = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireSessionUser();
    const { queryBillingForUser } = await import("./profile");
    const billing = await queryBillingForUser(user);
    return { user, billing };
  },
);

export const loadConfigPage = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireSessionUser();
    return { user };
  },
);

export const loadNovoProjetoPage = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireSessionUser();
    const { queryBillingForUser } = await import("./profile");
    const billing = await queryBillingForUser(user);
    return { user, billing };
  },
);

export const loadEditProjetoPage = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    const { getProjectById } = await import("./projects");
    const project = await getProjectById({ data: { id: data.id } });
    if (!project) throw redirect({ to: "/projetos" });
    return { user, project };
  });
