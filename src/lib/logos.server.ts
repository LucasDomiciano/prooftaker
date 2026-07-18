import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LOGO_DIR = join(process.cwd(), ".data", "logos");
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function ensureDir() {
  if (!existsSync(LOGO_DIR)) mkdirSync(LOGO_DIR, { recursive: true });
}

function extFromFile(type: string, name: string) {
  const lower = (name || "").toLowerCase();
  if (type.includes("svg") || lower.endsWith(".svg")) return "svg";
  if (type.includes("webp") || lower.endsWith(".webp")) return "webp";
  if (type.includes("gif") || lower.endsWith(".gif")) return "gif";
  if (type.includes("png") || lower.endsWith(".png")) return "png";
  return "jpg";
}

export async function saveProjectLogo(
  file: File,
  projectId: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) {
    return { ok: false, error: "Arquivo de logo vazio." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Logo acima do limite de 2 MB." };
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return {
      ok: false,
      error: "Formato não suportado. Use PNG, JPG, WEBP, GIF ou SVG.",
    };
  }

  const ext = extFromFile(file.type || "", file.name || "");
  const filename = `${projectId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { isSupabaseEnabled, getSupabaseServerClient, getSupabaseAdminClient } =
    await import("./supabase.server");

  if (isSupabaseEnabled()) {
    const client = getSupabaseAdminClient() || getSupabaseServerClient();
    // Remove logos anteriores do mesmo projeto
    const { data: existing } = await client.storage.from("logos").list("", {
      search: projectId,
      limit: 20,
    });
    const toRemove = (existing ?? [])
      .filter((f) => f.name === projectId || f.name.startsWith(`${projectId}.`))
      .map((f) => f.name);
    if (toRemove.length) {
      await client.storage.from("logos").remove(toRemove);
    }

    const { error } = await client.storage
      .from("logos")
      .upload(filename, buffer, {
        contentType: file.type || `image/${ext}`,
        upsert: true,
      });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, path: filename };
  }

  ensureDir();
  for (const f of ["png", "jpg", "jpeg", "webp", "gif", "svg"]) {
    const old = join(LOGO_DIR, `${projectId}.${f}`);
    if (existsSync(old)) {
      try {
        const { unlinkSync } = await import("node:fs");
        unlinkSync(old);
      } catch {
        /* ignore */
      }
    }
  }
  writeFileSync(join(LOGO_DIR, filename), buffer);
  return { ok: true, path: filename };
}

export async function deleteProjectLogo(projectId: string, path?: string) {
  const { isSupabaseEnabled, getSupabaseServerClient, getSupabaseAdminClient } =
    await import("./supabase.server");

  if (isSupabaseEnabled()) {
    const client = getSupabaseAdminClient() || getSupabaseServerClient();
    const { data: existing } = await client.storage.from("logos").list("", {
      search: projectId,
      limit: 20,
    });
    const toRemove = (existing ?? [])
      .filter((f) => f.name === projectId || f.name.startsWith(`${projectId}.`))
      .map((f) => f.name);
    if (path && !toRemove.includes(path)) toRemove.push(path);
    if (toRemove.length) await client.storage.from("logos").remove(toRemove);
    return;
  }

  ensureDir();
  const { unlinkSync } = await import("node:fs");
  const candidates = path
    ? [path]
    : ["png", "jpg", "jpeg", "webp", "gif", "svg"].map((e) => `${projectId}.${e}`);
  for (const name of candidates) {
    const full = join(LOGO_DIR, name.replace(/[^a-zA-Z0-9._-]/g, ""));
    if (existsSync(full)) {
      try {
        unlinkSync(full);
      } catch {
        /* ignore */
      }
    }
  }
}

export async function resolveLogoUrl(
  pathOrId: string | null | undefined,
): Promise<string | undefined> {
  if (!pathOrId) return undefined;
  const map = await resolveLogoUrls([pathOrId]);
  return map.get(pathOrId);
}

/** Resolve várias logos em 1 listagem do Storage (evita N requests por navegação). */
export async function resolveLogoUrls(
  pathOrIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const keys = [...new Set(pathOrIds.filter(Boolean))];
  if (!keys.length) return result;

  const { isSupabaseEnabled, getSupabaseEnv, getSupabaseAdminClient, getSupabaseServerClient } =
    await import("./supabase.server");

  if (!isSupabaseEnabled()) {
    for (const key of keys) {
      if (key.includes(".")) {
        if (existsSync(join(LOGO_DIR, key.replace(/[^a-zA-Z0-9._-]/g, "")))) {
          result.set(key, `/api/logos/${encodeURIComponent(key)}`);
        }
        continue;
      }
      for (const ext of ["png", "jpg", "jpeg", "webp", "gif", "svg"]) {
        const filename = `${key}.${ext}`;
        if (existsSync(join(LOGO_DIR, filename))) {
          result.set(key, `/api/logos/${encodeURIComponent(filename)}`);
          break;
        }
      }
    }
    return result;
  }

  const client = getSupabaseAdminClient() || getSupabaseServerClient();
  const { url } = getSupabaseEnv();
  const publicBase = `${url}/storage/v1/object/public/logos`;

  // Paths já com extensão → URL pública direta (sem list)
  const needList: string[] = [];
  for (const key of keys) {
    if (key.includes(".")) {
      result.set(key, `${publicBase}/${key}`);
    } else {
      needList.push(key);
    }
  }

  if (needList.length) {
    const { data } = await client.storage.from("logos").list("", { limit: 1000 });
    const files = data ?? [];
    for (const id of needList) {
      const file = files.find(
        (f) => f.name === id || f.name.startsWith(`${id}.`),
      );
      if (file) result.set(id, `${publicBase}/${file.name}`);
    }
  }

  return result;
}

export function readLogoFile(filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe !== filename) return null;
  const full = join(LOGO_DIR, safe);
  if (!existsSync(full)) return null;
  const data = readFileSync(full);
  const ext = safe.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "svg"
      ? "image/svg+xml"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : ext === "png"
            ? "image/png"
            : "image/jpeg";
  return { data, contentType };
}
