import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Copy, LayoutGrid, Quote, Rows3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TestimonialCard } from "@/components/testimonial-card";
import { Stars } from "@/components/stars";
import { loadWidgetsPage } from "@/lib/app-loaders";

export const Route = createFileRoute("/widgets")({
  loader: () => loadWidgetsPage(),
  head: () => ({ meta: [{ title: "Widgets · ProofTaker" }] }),
  component: WidgetsPage,
});

type WidgetType = "wall" | "carousel" | "single";

function WidgetsPage() {
  const { user, projects, testimonials } = Route.useLoaderData();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [type, setType] = useState<WidgetType>("wall");
  const [count, setCount] = useState(6);
  const [showStars, setShowStars] = useState(true);
  const [accent, setAccent] = useState("#0EA5A4");
  const [copied, setCopied] = useState(false);

  const selected = projects.find((p) => p.id === projectId) ?? projects[0];
  const approved = useMemo(
    () =>
      testimonials
        .filter((t) => t.status === "aprovado" && (!selected || t.projectId === selected.id))
        .slice(0, count),
    [testimonials, selected, count],
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embed = selected
    ? `<script src="${origin}/embed.js"
  data-project="${selected.slug}"
  data-type="${type}"
  data-count="${count}"
  data-stars="${showStars}"
  data-accent="${accent}"></script>`
    : "Crie um projeto para gerar o código embed.";

  const copy = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(embed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppShell title="Widgets embedáveis" user={user}>
      <p className="mb-6 text-sm text-muted-foreground">
        Escolha o formato, personalize e cole o código no seu site.
      </p>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <Label className="mb-2 block">Projeto</Label>
            <select
              value={selected?.id ?? ""}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-card">
            <Label className="mb-3 block">Tipo de widget</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "wall" as const, label: "Wall of Love", icon: LayoutGrid },
                { id: "carousel" as const, label: "Carrossel", icon: Rows3 },
                { id: "single" as const, label: "Único", icon: Quote },
              ].map((w) => (
                <button
                  key={w.id}
                  onClick={() => setType(w.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors ${
                    type === w.id
                      ? "border-primary bg-brand-soft text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <w.icon className="size-5" />
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
            <div>
              <Label className="mb-2 block">
                Qtd. depoimentos: <span className="font-bold">{count}</span>
              </Label>
              <input
                type="range"
                min={1}
                max={12}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <Label className="mb-2 block">Cor de destaque</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="size-10 cursor-pointer rounded-md border bg-transparent"
                />
                <code className="rounded bg-muted px-2 py-1 text-xs">{accent}</code>
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={showStars}
                onChange={(e) => setShowStars(e.target.checked)}
                className="size-4 accent-primary"
              />
              Mostrar estrelas
            </label>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-card">
            <Label className="mb-2 block">Código embed</Label>
            <pre className="max-h-40 overflow-auto rounded-md bg-foreground p-3 text-[11px] leading-relaxed text-background">
              <code>{embed}</code>
            </pre>
            <Button
              onClick={copy}
              className="mt-3 w-full bg-brand-gradient"
              size="sm"
              disabled={!selected}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiado!" : "Copiar embed"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pré-visualização
            </p>
            <span className="text-xs text-muted-foreground">seu-site.com.br</span>
          </div>

          {approved.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum depoimento aprovado neste projeto ainda.
            </p>
          ) : (
            <div>
              {type === "wall" && (
                <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4">
                  {approved.map((t) => (
                    <TestimonialCard key={t.id} t={t} />
                  ))}
                </div>
              )}

              {type === "carousel" && (
                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
                  {approved.map((t) => (
                    <div
                      key={t.id}
                      className="w-[280px] shrink-0 snap-start md:w-[340px]"
                    >
                      <TestimonialCard t={t} />
                    </div>
                  ))}
                </div>
              )}

              {type === "single" && approved[0] && (
                <div className="mx-auto max-w-2xl rounded-3xl border bg-card p-8 text-center shadow-glow">
                  <Quote className="mx-auto size-8 text-primary" />
                  {showStars && (
                    <div className="mt-4 flex justify-center">
                      <Stars rating={approved[0].rating} size={22} />
                    </div>
                  )}
                  <p className="mt-4 font-display text-xl leading-relaxed md:text-2xl">
                    "{approved[0].text}"
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <div className="grid size-12 place-items-center rounded-full bg-brand-soft font-semibold text-primary">
                      {approved[0].name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{approved[0].name}</p>
                      <p className="text-sm text-muted-foreground">
                        {approved[0].role} · {approved[0].company}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {user?.plan === "Free" && (
            <p className="mt-6 border-t pt-3 text-center text-xs text-muted-foreground">
              Feito com <span className="font-semibold text-primary">ProofTaker</span>
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5">
                Remova no Starter
              </span>
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
