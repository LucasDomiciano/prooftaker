import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          company: string;
          avatar_url: string;
          plan: "Free" | "Starter" | "Pro";
          notify_new: boolean;
          notify_weekly: boolean;
          notify_product: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string;
          color: string;
          logo_url?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string;
          color: string;
          logo_url?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
      };
      testimonials: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          role: string;
          company: string;
          avatar_url: string | null;
          text: string;
          text_original?: string | null;
          text_improved?: string | null;
          rating: number;
          has_video: boolean;
          video_path: string | null;
          status: "pendente" | "aprovado" | "recusado";
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          role?: string;
          company?: string;
          avatar_url?: string | null;
          text: string;
          text_original?: string | null;
          text_improved?: string | null;
          rating: number;
          has_video?: boolean;
          video_path?: string | null;
          status?: "pendente" | "aprovado" | "recusado";
          tags?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["testimonials"]["Row"]>;
      };
    };
  };
};

export function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, anonKey, serviceRoleKey };
}

export function isSupabaseEnabled() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

export function getSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Lovable Cloud).",
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookies) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value, cookie.options);
        });
      },
    },
  });
}

/** Client com service role — só no servidor, para upload público e admin. */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) return null;
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client sem cookies — para rotas públicas (coleta) onde getCookies/setCookie
 * podem falhar ou não há sessão. Prefere service role; senão anon puro.
 */
export function getSupabasePublicClient(): SupabaseClient<Database> {
  const admin = getSupabaseAdminClient();
  if (admin) return admin;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
  }
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
