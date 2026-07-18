import {
  clearSession,
  updateSession,
  useSession,
} from "@tanstack/react-start/server";
import { newId, readDb, toPublicUser, updateDb } from "./db.server";
import { mapProfile } from "./mappers";
import { hashPassword, verifyPassword } from "./password.server";
import { getSessionConfig, type AppSession } from "./session.server";
import { getSupabaseServerClient, isSupabaseEnabled } from "./supabase.server";
import type { PublicUser } from "./types";

export async function getUserFromSession(): Promise<PublicUser | null> {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    // getSession lê o JWT do cookie (rápido). getUser() revalida na Auth API (lento em toda navegação).
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      // Trigger pode atrasar no primeiro request — cria perfil sob demanda
      const name =
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] ||
        "Usuário";
      const company = (user.user_metadata?.company as string) || "";
      await supabase.from("profiles").upsert({
        id: user.id,
        name,
        company,
      });
      const { data: created } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!created) return null;
      return mapProfile(created, user.email || "");
    }

    return mapProfile(profile, user.email || "");
  }

  const session = await useSession<AppSession>(getSessionConfig());
  const userId = session.data.userId;
  if (!userId) return null;
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  return user ? toPublicUser(user) : null;
}

export async function loginUser(email: string, password: string) {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (error || !data.user) {
      return { ok: false as const, error: "E-mail ou senha inválidos." };
    }
    const user = await getUserFromSession();
    if (!user) {
      return { ok: false as const, error: "Perfil não encontrado." };
    }
    return { ok: true as const, user };
  }

  const db = await readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false as const, error: "E-mail ou senha inválidos." };
  }
  await updateSession(getSessionConfig(), { userId: user.id });
  return { ok: true as const, user: toPublicUser(user) };
}

export async function signupUser(input: {
  email: string;
  password: string;
  name: string;
  company?: string;
}) {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    const email = input.email.toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          name: input.name.trim(),
          company: input.company?.trim() || "",
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return { ok: false as const, error: "Este e-mail já está cadastrado." };
      }
      return { ok: false as const, error: error.message };
    }

    if (!data.user) {
      return { ok: false as const, error: "Não foi possível criar a conta." };
    }

    // Garante perfil mesmo se o trigger falhar
    await supabase.from("profiles").upsert({
      id: data.user.id,
      name: input.name.trim(),
      company: input.company?.trim() || "",
    });

    const user = await getUserFromSession();
    if (!user) {
      return {
        ok: false as const,
        error:
          "Conta criada. Se a confirmação de e-mail estiver ativa no Supabase, verifique sua caixa de entrada.",
      };
    }
    return { ok: true as const, user };
  }

  const email = input.email.toLowerCase();
  const db = await readDb();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false as const, error: "Este e-mail já está cadastrado." };
  }

  const user = {
    id: newId("u"),
    email,
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    company: input.company?.trim() || "",
    avatarUrl: "",
    plan: "Free" as const,
    notifyNew: true,
    notifyWeekly: true,
    notifyProduct: false,
    createdAt: new Date().toISOString(),
  };

  await updateDb((store) => {
    store.users.push(user);
  });
  await updateSession(getSessionConfig(), { userId: user.id });
  return { ok: true as const, user: toPublicUser(user) };
}

export async function logoutUser() {
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }
  await clearSession(getSessionConfig());
}
