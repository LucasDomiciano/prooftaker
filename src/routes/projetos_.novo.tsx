import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LogoPicker } from "@/components/logo-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/projects";
import { projectLimitFor } from "@/lib/plans";
import { loadNovoProjetoPage } from "@/lib/app-loaders";

export const Route = createFileRoute("/projetos_/novo")({
  loader: () => loadNovoProjetoPage(),
  head: () => ({ meta: [{ title: "Novo projeto · ProofTaker" }] }),
  component: NewProject,
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

function formatCreateError(err: unknown): string {
  if (!err) return "Não foi possível criar o projeto.";
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return "Falha de conexão ao salvar. Desative bloqueadores/antivírus para localhost ou tente de novo.";
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("validation") || msg.includes("invalid")) {
      return "Verifique o nome (mín. 2 letras) e o link (só a-z, 0-9 e hífen).";
    }
    return err.message;
  }
  return "Não foi possível criar o projeto.";
}

function NewProject() {
  const { user, billing } = Route.useLoaderData();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveSlug = slug || slugify(name) || "meu-projeto";
  const projectCount = billing?.projectCount ?? 0;
  const plan = billing?.plan ?? user.plan;
  const pLimit = projectLimitFor(plan);
  const atProjectLimit = pLimit != null && projectCount >= pLimit;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <Link
          to="/projetos"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar aos projetos
        </Link>

        <h1 className="font-display text-3xl font-bold tracking-tight">Novo projeto</h1>
        <p className="mt-2 text-muted-foreground">
          Cada projeto tem seu próprio link e widgets.
        </p>

        {atProjectLimit && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Seu plano permite até {pLimit} projeto(s).{" "}
            <Link to="/billing" className="font-semibold underline">
              Faça upgrade
            </Link>{" "}
            para criar mais.
          </div>
        )}

        <form
          className="mt-8 space-y-6 rounded-2xl border bg-card p-6 shadow-card md:p-8"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);

            if (atProjectLimit) {
              setError(
                `Seu plano permite até ${pLimit} projeto(s). Faça upgrade em Planos.`,
              );
              return;
            }

            const trimmedName = name.trim();
            const finalSlug = slugify(effectiveSlug);
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
              fd.set("name", trimmedName);
              fd.set("slug", finalSlug);
              fd.set("description", desc);
              fd.set("color", color);
              if (logoFile) fd.set("logo", logoFile);

              const result = await createProject({ data: fd });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              await navigate({ to: "/projetos" });
            } catch (err) {
              setError(formatCreateError(err));
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label>Logo do projeto (opcional)</Label>
            <LogoPicker
              previewUrl={logoPreview}
              fileName={logoFile?.name}
              colorFallback={color}
              initialLetter={name.charAt(0) || "?"}
              disabled={atProjectLimit}
              onFileChange={(file) => {
                setLogoFile(file);
                setLogoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do projeto</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              placeholder="Ex: Estúdio Ana Design"
              required
              disabled={atProjectLimit}
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
                value={effectiveSlug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-50"
                disabled={atProjectLimit}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Só letras, números e hífens. Sem acentos.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <Textarea
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Uma breve descrição para você lembrar do que se trata."
              rows={3}
              disabled={atProjectLimit}
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
                  disabled={atProjectLimit}
                  className="grid size-10 place-items-center rounded-lg border-2 transition-all disabled:opacity-50"
                  style={{
                    background: c,
                    borderColor: color === c ? "var(--color-foreground)" : "transparent",
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
            {atProjectLimit ? (
              <Button type="button" className="bg-brand-gradient" asChild>
                <Link to="/billing">Ver planos</Link>
              </Button>
            ) : (
              <Button type="submit" className="bg-brand-gradient" disabled={loading}>
                {loading ? "Criando..." : "Criar projeto"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
