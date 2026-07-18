import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ALLOWED_VIDEO_TYPES,
  extFromVideo,
  MAX_VIDEO_BYTES,
} from "./video-upload";

/**
 * Cria um slot de upload assinado no Storage.
 * O browser envia o arquivo direto ao Supabase (evita o limite ~4,5 MB da Vercel).
 */
export const createVideoUploadSlot = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contentType: z.string().min(1),
      fileName: z.string().optional(),
      fileSize: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { isSupabaseEnabled, getSupabaseAdminClient, getSupabaseServerClient } =
      await import("./supabase.server");

    if (!isSupabaseEnabled()) {
      return {
        ok: false as const,
        error: "Upload direto exige Supabase configurado.",
        fallbackServer: true as const,
      };
    }

    if (data.fileSize != null && data.fileSize > MAX_VIDEO_BYTES) {
      return {
        ok: false as const,
        error: "Vídeo acima do limite de 100 MB.",
      };
    }

    const type = data.contentType || "video/mp4";
    const allowedOrGeneric =
      ALLOWED_VIDEO_TYPES.has(type) || type.startsWith("video/");
    if (!allowedOrGeneric) {
      return {
        ok: false as const,
        error: "Formato não suportado. Use MP4, MOV ou WEBM.",
      };
    }

    const ext = extFromVideo(type, data.fileName || "");
    const path = `${crypto.randomUUID()}.${ext}`;
    const client = getSupabaseAdminClient() || getSupabaseServerClient();

    const { data: signed, error } = await client.storage
      .from("videos")
      .createSignedUploadUrl(path);

    if (error || !signed?.token) {
      return {
        ok: false as const,
        error:
          error?.message ||
          "Não foi possível criar URL de upload. Confira o bucket 'videos' e SUPABASE_SERVICE_ROLE_KEY.",
        fallbackAnon: true as const,
        path,
      };
    }

    return {
      ok: true as const,
      path: signed.path || path,
      token: signed.token,
    };
  });
