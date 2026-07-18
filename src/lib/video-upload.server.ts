import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ALLOWED_VIDEO_TYPES,
  extFromVideo,
  MAX_VIDEO_BYTES,
} from "./video-upload";

/**
 * Cria um slot de upload assinado no Storage + registra path no banco.
 * O browser envia o arquivo direto ao Supabase (evita o limite ~4,5 MB da Vercel).
 * Exige SUPABASE_SERVICE_ROLE_KEY (sem fallback anon).
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
    const { isSupabaseEnabled, getSupabaseAdminClient } = await import(
      "./supabase.server"
    );

    if (!isSupabaseEnabled()) {
      return {
        ok: false as const,
        error: "Upload direto exige Supabase configurado.",
      };
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return {
        ok: false as const,
        error:
          "Upload de vídeo exige SUPABASE_SERVICE_ROLE_KEY no servidor (URL assinada).",
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

    const { data: signed, error } = await admin.storage
      .from("videos")
      .createSignedUploadUrl(path);

    if (error || !signed?.token) {
      return {
        ok: false as const,
        error:
          error?.message ||
          "Não foi possível criar URL de upload. Confira o bucket 'videos'.",
      };
    }

    const finalPath = signed.path || path;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: slotError } = await admin.from("video_upload_slots").upsert({
      path: finalPath,
      expires_at: expiresAt,
      consumed_at: null,
      created_at: new Date().toISOString(),
    } as never);

    if (slotError) {
      // Migration 007 ainda não aplicada — upload assinado ainda funciona,
      // mas submit rejeitará videoPath até aplicar a migration.
      console.warn("[video slot]", slotError.message);
    }

    return {
      ok: true as const,
      path: finalPath,
      token: signed.token,
    };
  });
