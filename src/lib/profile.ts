import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { projectLimitFor, testimonialLimitFor, type PaidPlan } from "./plans";
import type { Plan } from "./types";

const profileSchema = z.object({
  name: z.string().min(2),
  company: z.string().optional(),
  email: z.string().email(),
  notifyNew: z.boolean(),
  notifyWeekly: z.boolean(),
  notifyProduct: z.boolean(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .validator(profileSchema)
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Não autenticado." };

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const email = data.email.toLowerCase();

      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          return { ok: false as const, error: emailError.message };
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: data.name.trim(),
          company: data.company?.trim() || "",
          notify_new: data.notifyNew,
          notify_weekly: data.notifyWeekly,
          notify_product: data.notifyProduct,
        })
        .eq("id", user.id);

      if (error) return { ok: false as const, error: error.message };

      const next = await getUserFromSession();
      if (!next) return { ok: false as const, error: "Perfil não encontrado." };
      return { ok: true as const, user: next };
    }

    const { readDb, toPublicUser, updateDb } = await import("./db.server");
    const email = data.email.toLowerCase();
    const db = await readDb();
    if (db.users.some((u) => u.email.toLowerCase() === email && u.id !== user.id)) {
      return { ok: false as const, error: "Este e-mail já está em uso." };
    }

    await updateDb((store) => {
      const current = store.users.find((u) => u.id === user.id);
      if (!current) return;
      current.name = data.name.trim();
      current.company = data.company?.trim() || "";
      current.email = email;
      current.notifyNew = data.notifyNew;
      current.notifyWeekly = data.notifyWeekly;
      current.notifyProduct = data.notifyProduct;
    });

    const next = (await readDb()).users.find((u) => u.id === user.id)!;
    return { ok: true as const, user: toPublicUser(next) };
  });

export const deleteAccount = createServerFn({ method: "POST" }).handler(
  async () => {
    const { getUserFromSession, logoutUser } = await import("./auth.server");
    const {
      isSupabaseEnabled,
      getSupabaseServerClient,
      getSupabaseAdminClient,
    } = await import("./supabase.server");
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Não autenticado." };

    if (isSupabaseEnabled()) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        await admin.from("profiles").delete().eq("id", user.id);
        await admin.auth.admin.deleteUser(user.id);
      } else {
        // Sem service role: apaga dados e encerra sessão; usuário auth permanece
        const supabase = getSupabaseServerClient();
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("owner_id", user.id);
        const ids = (projects ?? []).map((p) => p.id);
        if (ids.length) {
          await supabase.from("testimonials").delete().in("project_id", ids);
        }
        await supabase.from("projects").delete().eq("owner_id", user.id);
        await supabase.from("profiles").delete().eq("id", user.id);
      }
      await logoutUser();
      return { ok: true as const };
    }

    const { updateDb } = await import("./db.server");
    await updateDb((store) => {
      const projectIds = store.projects
        .filter((p) => p.ownerId === user.id)
        .map((p) => p.id);
      store.testimonials = store.testimonials.filter(
        (t) => !projectIds.includes(t.projectId),
      );
      store.projects = store.projects.filter((p) => p.ownerId !== user.id);
      store.users = store.users.filter((u) => u.id !== user.id);
    });
    await logoutUser();
    return { ok: true as const };
  },
);

export async function queryBillingForUser(user: {
  id: string;
  plan: Plan;
}) {
  const { isSupabaseEnabled, getSupabaseServerClient } = await import(
    "./supabase.server"
  );
  const tLimit = testimonialLimitFor(user.plan);
  const pLimit = projectLimitFor(user.plan);

  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", user.id);
    const ids = (projects ?? []).map((p) => p.id);
    const { count } = await supabase
      .from("testimonials")
      .select("*", { count: "exact", head: true })
      .in(
        "project_id",
        ids.length ? ids : ["00000000-0000-0000-0000-000000000000"],
      )
      .neq("status", "recusado");

    return {
      plan: user.plan,
      used: count ?? 0,
      limit: tLimit,
      projectCount: ids.length,
      projectLimit: pLimit,
      stripeEnabled: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          (process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_STARTER),
      ),
      backend: "supabase" as const,
    };
  }

  const { readDb } = await import("./db.server");
  const db = await readDb();
  const projects = db.projects.filter((p) => p.ownerId === user.id);
  const projectIds = projects.map((p) => p.id);
  const used = db.testimonials.filter(
    (t) => projectIds.includes(t.projectId) && t.status !== "recusado",
  ).length;

  return {
    plan: user.plan,
    used,
    limit: tLimit,
    projectCount: projects.length,
    projectLimit: pLimit,
    stripeEnabled: Boolean(
      process.env.STRIPE_SECRET_KEY &&
        (process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_STARTER),
    ),
    backend: "local" as const,
  };
}

export const getBillingSummary = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getUserFromSession } = await import("./auth.server");
    const user = await getUserFromSession();
    if (!user) return null;
    return queryBillingForUser(user);
  },
);

export const upgradeToPlan = createServerFn({ method: "POST" })
  .validator(z.object({ plan: z.enum(["Starter", "Pro"]) }))
  .handler(async ({ data }) => {
    const { getUserFromSession } = await import("./auth.server");
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    const { isStripeEnabled } = await import("./stripe");
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, error: "Não autenticado." };

    if (isStripeEnabled()) {
      return {
        ok: false as const,
        error: "Use o checkout Stripe.",
        stripeEnabled: true as const,
      };
    }

    const plan = data.plan as PaidPlan;

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from("profiles")
        .update({ plan })
        .eq("id", user.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, mode: "supabase" as const, plan };
    }

    const { updateDb } = await import("./db.server");
    await updateDb((store) => {
      const current = store.users.find((u) => u.id === user.id);
      if (current) current.plan = plan;
    });

    return { ok: true as const, mode: "local" as const, plan };
  });

/** @deprecated use upgradeToPlan */
export const upgradeToPro = createServerFn({ method: "POST" }).handler(
  async () => upgradeToPlan({ data: { plan: "Pro" } }),
);

export const getBackendMode = createServerFn({ method: "GET" }).handler(
  async () => {
    const { isSupabaseEnabled } = await import("./supabase.server");
    return { supabase: isSupabaseEnabled() };
  },
);
