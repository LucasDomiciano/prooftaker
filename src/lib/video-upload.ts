/** Constantes e validação compartilhadas para upload de vídeo (client + server). */

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

/** path gerado por nós: uuid.ext */
export const VIDEO_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm|mov|m4v)$/i;

export function extFromVideo(type: string, name: string) {
  const lower = (name || "").toLowerCase();
  if (type.includes("webm") || lower.endsWith(".webm")) return "webm";
  if (type.includes("quicktime") || lower.endsWith(".mov")) return "mov";
  if (lower.endsWith(".m4v") || type.includes("m4v")) return "m4v";
  return "mp4";
}

export function validateVideoFile(
  file: File,
): { ok: true } | { ok: false; error: string } {
  if (!file || file.size === 0) {
    return { ok: false, error: "Arquivo de vídeo vazio." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "Vídeo acima do limite de 100 MB." };
  }
  const type = (file.type || "").split(";")[0].trim();
  const name = (file.name || "").toLowerCase();
  const extOk = /\.(mp4|webm|mov|m4v)$/i.test(name);
  const typeOk =
    !type ||
    ALLOWED_VIDEO_TYPES.has(type) ||
    type === "video/mp4" ||
    type.startsWith("video/");
  if (!typeOk && !extOk) {
    return {
      ok: false,
      error: "Formato não suportado. Use MP4, MOV ou WEBM.",
    };
  }
  return { ok: true };
}

export function isSafeVideoPath(path: string) {
  return VIDEO_PATH_RE.test(path);
}
