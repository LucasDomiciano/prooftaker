import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extFromVideo, validateVideoFile } from "./video-upload";

const VIDEO_DIR = join(process.cwd(), ".data", "videos");

function ensureDir() {
  if (!existsSync(VIDEO_DIR)) mkdirSync(VIDEO_DIR, { recursive: true });
}

export async function saveUploadedVideo(
  file: File,
  id: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const check = validateVideoFile(file);
  if (!check.ok) return check;

  const ext = extFromVideo(file.type || "", file.name || "");
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
