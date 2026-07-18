import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Copy,
  ExternalLink,
  MessageCircle,
  Plus,
  Check,
  Pencil,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PlanLimitBanner } from "@/components/plan-limit-banner";
import { Button } from "@/components/ui/button";
import { FREE_PROJECT_LIMIT } from "@/lib/types";
import { projectLimitFor } from "@/lib/plans";
import { loadProjetosPage } from "@/lib/app-loaders";

export const Route = createFileRoute("/projetos")({
  loader: () => loadProjetosPage(),
  head: () => ({ meta: [{ title: "Projetos · ProofTaker" }] }),
  component: ProjectsList,
});

function ProjectsList() {
  const { user, projects, billing } = Route.useLoaderData();
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AppShell title="Projetos" user={user}>
      <PlanLimitBanner
        plan={billing?.plan ?? user.plan}
        usedTestimonials={billing?.used ?? 0}
        projectCount={billing?.projectCount ?? projects.length}
      />

      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cada projeto tem seu próprio link de coleta.
        </p>
        {(billing?.plan ?? user.plan) !== "Pro" &&
        (billing?.projectCount ?? projects.length) >=
          (projectLimitFor(billing?.plan ?? user.plan) ?? FREE_PROJECT_LIMIT) ? (
          <Button className="bg-brand-gradient" asChild>
            <Link to="/billing">Upgrade para mais projetos</Link>
          </Button>
        ) : (
          <Button className="bg-brand-gradient" asChild>
            <Link to="/projetos/novo">
              <Plus className="size-4" /> Novo projeto
            </Link>
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
          <p className="text-muted-foreground">Você ainda não tem projetos.</p>
          <Button className="mt-4 bg-brand-gradient" asChild>
            <Link to="/projetos/novo">Criar primeiro projeto</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const path = `/coletar/${p.slug}`;
            const absolute = `${origin}${path}`;
            const wa = `https://wa.me/?text=${encodeURIComponent(
              `Oi! Adoraria seu depoimento sobre nosso trabalho. Leva 2 min: ${absolute || path}`,
            )}`;
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border bg-card p-5 shadow-card"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div
                    className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg"
                    style={{ background: p.logoUrl ? undefined : p.color }}
                  >
                    {p.logoUrl ? (
                      <img
                        src={p.logoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {p.count} depoimentos
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" asChild>
                    <Link
                      to="/projetos/$id/editar"
                      params={{ id: p.id }}
                      aria-label="Editar projeto"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {p.description || "Sem descrição"}
                </p>
                <div className="mb-3 flex items-center gap-2 rounded-md border bg-surface px-3 py-2 text-xs">
                  <span className="truncate flex-1 font-mono">{absolute || path}</span>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Copiar link"
                    onClick={async () => {
                      await navigator.clipboard.writeText(absolute || path);
                      setCopied(p.id);
                      setTimeout(() => setCopied(null), 1500);
                    }}
                  >
                    {copied === p.id ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-success/30 text-success hover:bg-success/10 hover:text-success"
                    asChild
                  >
                    <a href={wa} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" /> WhatsApp
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/coletar/$slug" params={{ slug: p.slug }}>
                      <ExternalLink className="size-4" /> Abrir
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
