import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/videos/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { isSupabaseEnabled } = await import("@/lib/supabase.server");
        const { signVideoUrl, readVideoFile } = await import("@/lib/videos.server");

        if (isSupabaseEnabled()) {
          const url = await signVideoUrl(params.id);
          if (!url) return new Response("Not found", { status: 404 });
          return Response.redirect(url, 302);
        }

        const file = readVideoFile(params.id);
        if (!file) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(new Uint8Array(file.data), {
          headers: {
            "Content-Type": file.contentType,
            "Cache-Control": "private, max-age=3600",
            "Content-Length": String(file.data.byteLength),
          },
        });
      },
    },
  },
});
