import { createClient } from "@supabase/supabase-js";
import { createVideoUploadSlot } from "./video-upload.server";
import { validateVideoFile } from "./video-upload";

function getBrowserSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Sobe o vídeo direto no Supabase Storage via URL assinada
 * (browser → Storage), sem passar pela Vercel e sem insert anon.
 */
export async function uploadCollectVideo(
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const check = validateVideoFile(file);
  if (!check.ok) return check;

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase não configurado no client (VITE_SUPABASE_URL / ANON_KEY).",
    };
  }

  const slot = await createVideoUploadSlot({
    data: {
      contentType: file.type || "video/webm",
      fileName: file.name,
      fileSize: file.size,
    },
  });

  if (!slot.ok) {
    return { ok: false, error: slot.error };
  }

  const { error } = await supabase.storage
    .from("videos")
    .uploadToSignedUrl(slot.path, slot.token, file, {
      contentType: file.type || "video/webm",
      upsert: true,
    });

  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "Falha no upload do vídeo. Confira se o bucket 'videos' existe.",
    };
  }

  return { ok: true, path: slot.path };
}
