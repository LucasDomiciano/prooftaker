import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Heart, Star, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VideoCapture } from "@/components/video-capture";
import { getProjectBySlug } from "@/lib/projects";
import { submitTestimonial } from "@/lib/testimonials";

export const Route = createFileRoute("/coletar/$slug")({
  validateSearch: z.object({
    t: z.string().optional(),
  }),
  loader: async ({ params }) => {
    const project = await getProjectBySlug({ data: { slug: params.slug } });
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Deixe seu depoimento · ${loaderData.project.name}`
          : "Depoimento",
      },
      {
        name: "description",
        content: loaderData
          ? `Compartilhe sua experiência com ${loaderData.project.name}. Leva 2 minutos.`
          : "Deixe seu depoimento",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CollectPage,
});

function CollectPage() {
  const { project } = Route.useLoaderData();
  const { t: magicToken } = Route.useSearch();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [sent, setSent] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (sent) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand-soft px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-glow">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">Obrigado!</h1>
          <p className="mt-3 text-muted-foreground">
            Seu depoimento foi enviado com sucesso para <b>{project.name}</b>. Assim
            que for aprovado, ele pode aparecer no site.
          </p>
          <div className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <Heart className="size-4 fill-destructive text-destructive" />
            Sua opinião faz toda a diferença
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Feito com{" "}
            <a href="/" className="font-semibold text-primary">
              ProofTaker
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-10">
      <header
        className="px-6 py-10 text-center text-primary-foreground"
        style={{
          background: `linear-gradient(135deg, ${project.color} 0%, oklch(0.42 0.13 235) 100%)`,
        }}
      >
        <div className="mx-auto grid size-14 place-items-center overflow-hidden rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur">
          {project.logoUrl ? (
            <img
              src={project.logoUrl}
              alt={project.name}
              className="size-full object-cover"
            />
          ) : (
            project.name.charAt(0)
          )}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold md:text-3xl">
          Deixe seu depoimento
        </h1>
        <p className="mt-2 opacity-90">
          para <b>{project.name}</b> · leva menos de 2 minutos
        </p>
      </header>

      <form
        className="mx-auto -mt-6 max-w-lg space-y-5 rounded-2xl border bg-card p-6 shadow-glow md:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            const fd = new FormData();
            fd.set("slug", project.slug);
            fd.set("name", name);
            fd.set("role", role);
            fd.set("company", company);
            fd.set("text", text);
            fd.set("rating", String(rating));
            if (authorEmail.trim()) fd.set("authorEmail", authorEmail.trim());
            if (magicToken) fd.set("magicToken", magicToken);
            if (videoFile) fd.set("video", videoFile);

            const result = await submitTestimonial({ data: fd });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSent(true);
          } catch {
            setError("Não foi possível enviar. Tente novamente.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Seu nome *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Maria Silva"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Fundadora"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: Café da Vila"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="authorEmail">E-mail (opcional)</Label>
          <Input
            id="authorEmail"
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="para receber um obrigado"
          />
        </div>

        <div className="space-y-2">
          <Label>Sua avaliação</Label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover(i + 1)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i + 1)}
                className="p-1"
                aria-label={`${i + 1} estrelas`}
              >
                <Star
                  className={`size-8 transition-colors ${
                    i < (hover || rating)
                      ? "fill-warning text-warning"
                      : "fill-transparent text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="text">Seu depoimento *</Label>
          <Textarea
            id="text"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Conte como foi sua experiência. O que mais te marcou? Que resultado teve?"
            required
            minLength={10}
          />
        </div>

        <VideoCapture
          disabled={loading}
          onCaptured={(file) => setVideoFile(file)}
        />

        <div className="space-y-2">
          <Label>Ou envie um arquivo de vídeo</Label>
          <label
            htmlFor="video"
            className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-colors hover:border-primary hover:bg-brand-soft/50"
          >
            <div className="grid size-11 place-items-center rounded-lg bg-brand-soft text-primary">
              {videoFile ? <Video className="size-5" /> : <Upload className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {videoFile?.name ?? "Enviar MP4 / MOV / WEBM"}
              </p>
              <p className="text-xs text-muted-foreground">
                {videoFile
                  ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB`
                  : "até 100 MB · 60s ideal"}
              </p>
            </div>
            <input
              id="video"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full bg-brand-gradient" disabled={loading}>
          {loading ? "Enviando..." : "Enviar depoimento"}
        </Button>
      </form>
    </div>
  );
}
