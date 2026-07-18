import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LogoPicker } from "@/components/logo-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/lib/projects";
import { loadEditProjetoPage } from "@/lib/app-loaders";

export const Route = createFileRoute("/projetos_/$id/editar")({
  loader: ({ params }) => loadEditProjetoPage({ data: { id: params.id } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Editar · ${loaderData.project.name} · ProofTaker`
          : "Editar projeto · ProofTaker",
      },
    ],
  }),
  component: EditProject,
});

const PALETTE = [
  "oklch(0.55 0.13 178)",
  "oklch(0.42 0.13 235)",
  "oklch(0.65 0.16 155)",
  "oklch(0.7 0.18 60)",
  "oklch(0.6 0.22 25)",
  "oklch(0.55 0.2 320)",
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function EditProject() {
  const { user, project } = Route.useLoaderData();
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [desc, setDesc] = useState(project.description);
  const [color, setColor] = useState(project.color);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    project.logoUrl || null,
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <Link
          to="/projetos"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar aos projetos
        </Link>

        <h1 className="font-display text-3xl font-bold tracking-tight">
          Editar projeto
        </h1>
        <p className="mt-2 text-muted-foreground">
          Atualize nome, link, logo e aparência.
        </p>

        <form
          className="mt-8 space-y-6 rounded-2xl border bg-card p-6 shadow-card md:p-8"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const trimmedName = name.trim();
            const finalSlug = slugify(slug);
            if (trimmedName.length < 2) {
              setError("O nome precisa ter pelo menos 2 caracteres.");
              return;
            }
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(finalSlug)) {
              setError("Link inválido. Use só letras, números e hífens.");
              return;
            }

            setLoading(true);
            try {
              const fd = new FormData();
              fd.set("id", project.id);
              fd.set("name", trimmedName);
              fd.set("slug", finalSlug);
              fd.set("description", desc);
              fd.set("color", color);
              if (removeLogo) fd.set("removeLogo", "1");
              if (logoFile) fd.set("logo", logoFile);

              const result = await updateProject({ data: fd });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              await navigate({ to: "/projetos" });
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Não foi possível salvar o projeto.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label>Logo do projeto</Label>
            <LogoPicker
              previewUrl={removeLogo ? null : logoPreview}
              fileName={logoFile?.name}
              colorFallback={color}
              initialLetter={name.charAt(0) || "?"}
              showRemove={Boolean((logoPreview || project.logoUrl) && !removeLogo)}
              onFileChange={(file) => {
                setLogoFile(file);
                setRemoveLogo(false);
                setLogoPreview(file ? URL.createObjectURL(file) : null);
              }}
              onRemove={() => {
                setLogoFile(null);
                setLogoPreview(null);
                setRemoveLogo(true);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do projeto</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Link de coleta</Label>
            <div className="flex items-center overflow-hidden rounded-md border">
              <span className="border-r bg-muted px-3 py-2 text-sm text-muted-foreground">
                /coletar/
              </span>
              <input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <Textarea
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor do projeto</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="grid size-10 place-items-center rounded-lg border-2 transition-all"
                  style={{
                    background: c,
                    borderColor:
                      color === c ? "var(--color-foreground)" : "transparent",
                  }}
                  aria-label="Selecionar cor"
                >
                  {color === c && <Check className="size-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button type="button" variant="outline" asChild>
              <Link to="/projetos">Cancelar</Link>
            </Button>
            <Button type="submit" className="bg-brand-gradient" disabled={loading}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
