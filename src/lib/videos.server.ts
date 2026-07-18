import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VIDEO_DIR = join(process.cwd(), ".data", "videos");
const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

function ensureDir() {
  if (!existsSync(VIDEO_DIR)) mkdirSync(VIDEO_DIR, { recursive: true });
}

function extFromType(type: string, name: string) {
  if (type.includes("webm")) return "webm";
  if (type.includes("quicktime") || name.toLowerCase().endsWith(".mov")) return "mov";
  return "mp4";
}

export async function saveUploadedVideo(
  file: File,
  id: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) {
    return { ok: false, error: "Arquivo de vídeo vazio." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Vídeo acima do limite de 100 MB." };
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return {
      ok: false,
      error: "Formato não suportado. Use MP4, MOV ou WEBM.",
    };
  }

  const ext = extFromType(file.type || "", file.name || "");
  const filename = `${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { isSupabaseEnabled, getSupabaseServerClient, getSupabaseAdminClient } =
    await import("./supabase.server");

  if (isSupabaseEnabled()) {
    const client = getSupabaseAdminClient() || getSupabaseServerClient();
    const contentType = file.type || "video/mp4";
    const { error } = await client.storage
      .from("videos")
      .upload(filename, buffer, { contentType, upsert: true });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, path: filename };
  }

  ensureDir();
  writeFileSync(join(VIDEO_DIR, filename), buffer);
  return { ok: true, path: filename };
}

export async function signVideoUrl(path: string): Promise<string | null> {
  const { isSupabaseEnabled, getSupabaseServerClient, getSupabaseAdminClient } =
    await import("./supabase.server");

  if (!isSupabaseEnabled()) {
    return `/api/videos/${encodeURIComponent(path)}`;
  }

  const client = getSupabaseAdminClient() || getSupabaseServerClient();
  const { data, error } = await client.storage
    .from("videos")
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function readVideoFile(filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe !== filename) return null;
  const full = join(VIDEO_DIR, safe);
  if (!existsSync(full)) return null;
  const data = readFileSync(full);
  const ext = safe.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "webm"
      ? "video/webm"
      : ext === "mov"
        ? "video/quicktime"
        : "video/mp4";
  return { data, contentType };
}
