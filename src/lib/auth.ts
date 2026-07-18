import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";
import type { PublicUser } from "./types";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = credentialsSchema.extend({
  name: z.string().min(2),
  company: z.string().optional(),
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicUser | null> => {
    const { getUserFromSession } = await import("./auth.server");
    return getUserFromSession();
  },
);

export const requireUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicUser> => {
    const { getUserFromSession } = await import("./auth.server");
    const user = await getUserFromSession();
    if (!user) throw redirect({ to: "/login" });
    return user;
  },
);

export const loginFn = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    const { loginUser } = await import("./auth.server");
    return loginUser(data.email, data.password);
  });

export const signupFn = createServerFn({ method: "POST" })
  .validator(signupSchema)
  .handler(async ({ data }) => {
    const { signupUser } = await import("./auth.server");
    return signupUser(data);
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutUser } = await import("./auth.server");
  await logoutUser();
  return { ok: true as const };
});

export const startGoogleOAuth = createServerFn({ method: "POST" }).handler(
  async () => {
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    if (!isSupabaseEnabled()) {
      return {
        ok: false as const,
        error: "Google login exige Supabase/Lovable Cloud configurado.",
      };
    }

    const origin = getRequestUrl().origin;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error || !data.url) {
      return {
        ok: false as const,
        error: error?.message || "Não foi possível iniciar o login Google.",
      };
    }

    return { ok: true as const, url: data.url };
  },
);

export const exchangeAuthCode = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    if (!isSupabaseEnabled()) {
      return { ok: false as const, error: "Supabase não configurado." };
    }
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    if (!isSupabaseEnabled()) {
      return {
        ok: false as const,
        error: "Recuperação de senha exige Supabase configurado.",
      };
    }
    const origin = getRequestUrl().origin;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      data.email.toLowerCase(),
      { redirectTo: `${origin}/redefinir-senha` },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const updatePasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(6) }))
  .handler(async ({ data }) => {
    const { isSupabaseEnabled, getSupabaseServerClient } = await import(
      "./supabase.server"
    );
    if (!isSupabaseEnabled()) {
      return { ok: false as const, error: "Supabase não configurado." };
    }
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
