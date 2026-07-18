import { createClient } from "@supabase/supabase-js";
import { createVideoUploadSlot } from "./video-upload.server";
import { isSafeVideoPath, validateVideoFile } from "./video-upload";

function getBrowserSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Sobe o vídeo direto no Supabase Storage (browser → Storage),
 * sem passar o arquivo pela função serverless da Vercel.
 */
export async function uploadCollectVideo(
  file: File,
): Promise<
  | { ok: true; path: string }
  | { ok: false; error: string; useServerUpload?: boolean }
> {
  const check = validateVideoFile(file);
  if (!check.ok) return check;

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase não configurado no client.",
      useServerUpload: true,
    };
  }

  const slot = await createVideoUploadSlot({
    data: {
      contentType: file.type || "video/webm",
      fileName: file.name,
      fileSize: file.size,
    },
  });

  if (slot.ok) {
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

  // Fallback: policy anon insert (migration 001)
  if ("fallbackAnon" in slot && slot.fallbackAnon && slot.path) {
    if (!isSafeVideoPath(slot.path)) {
      return { ok: false, error: "Caminho de vídeo inválido." };
    }
    const { error } = await supabase.storage
      .from("videos")
      .upload(slot.path, file, {
        contentType: file.type || "video/webm",
        upsert: true,
      });
    if (error) {
      return {
        ok: false,
        error:
          error.message ||
          "Falha no upload. Aplique a migration do bucket 'videos' e a policy de insert.",
      };
    }
    return { ok: true, path: slot.path };
  }

  if ("fallbackServer" in slot && slot.fallbackServer) {
    return { ok: false, error: slot.error, useServerUpload: true };
  }

  return { ok: false, error: slot.error };
}
