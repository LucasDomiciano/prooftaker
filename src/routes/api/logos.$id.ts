import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/logos/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { readLogoFile } = await import("@/lib/logos.server");
        const file = readLogoFile(params.id);
        if (!file) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(new Uint8Array(file.data), {
          headers: {
            "Content-Type": file.contentType,
            "Cache-Control": "public, max-age=3600",
            "Content-Length": String(file.data.byteLength),
          },
        });
      },
    },
  },
});
