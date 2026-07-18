import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Filter, MessageSquare, Search, Star, TrendingUp, Video, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PlanLimitBanner } from "@/components/plan-limit-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stars } from "@/components/stars";
import { moderateTestimonial } from "@/lib/testimonials";
import { loadDashboardPage } from "@/lib/app-loaders";

export const Route = createFileRoute("/dashboard")({
  loader: () => loadDashboardPage(),
  head: () => ({ meta: [{ title: "Depoimentos · ProofTaker" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, projects, testimonials, billing } = Route.useLoaderData();
  const router = useRouter();
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "aprovado" | "pendente">("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const list = useMemo(() => {
    return testimonials.filter((t) => {
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (q && !`${t.name} ${t.company} ${t.text}`.toLowerCase().includes(q.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [projectFilter, statusFilter, q, testimonials]);

  const stats = {
    total: testimonials.length,
    pending: testimonials.filter((t) => t.status === "pendente").length,
    withVideo: testimonials.filter((t) => t.hasVideo).length,
    avg:
      testimonials.length === 0
        ? "—"
        : (
            testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length
          ).toFixed(1),
  };

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const moderate = async (id: string, status: "aprovado" | "recusado") => {
    setBusyId(id);
    try {
      await moderateTestimonial({ data: { id, status } });
      await router.invalidate();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title="Depoimentos" user={user}>
      <PlanLimitBanner
        plan={billing?.plan ?? user.plan}
        usedTestimonials={billing?.used ?? testimonials.length}
        projectCount={billing?.projectCount ?? projects.length}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: MessageSquare },
          { label: "Pendentes", value: stats.pending, icon: Filter },
          { label: "Com vídeo", value: stats.withVideo, icon: Video },
          { label: "Nota média", value: stats.avg, icon: Star },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <s.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, empresa ou texto..."
            className="pl-9"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos os projetos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
          {(["all", "pendente", "aprovado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-1 font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-surface-elevated text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
            <TrendingUp className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            Nenhum depoimento encontrado com esses filtros.
          </div>
        )}
        {list.map((t) => {
          const project = projectMap[t.projectId];
          return (
            <div
              key={t.id}
              className="rounded-xl border bg-card p-5 shadow-card transition-shadow hover:shadow-glow"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-primary">
                  {t.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{t.name}</p>
                    <span className="text-sm text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">
                      {t.role}, {t.company}
                    </span>
                    {t.hasVideo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                        <Video className="size-3" /> Vídeo
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === "aprovado"
                          ? "bg-success/15 text-success"
                          : "bg-warning/20 text-warning-foreground"
                      }`}
                    >
                      {t.status === "aprovado" ? "Aprovado" : "Pendente"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <Stars rating={t.rating} size={12} />
                    {project && <span>· {project.name}</span>}
                    <span>· {new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-foreground">
                    "{t.text}"
                  </p>
                  {t.hasVideo && t.videoPath && (
                    <div className="mt-3">
                      {playingId === t.id ? (
                        <video
                          src={
                            t.videoPath.startsWith("http")
                              ? t.videoPath
                              : `/api/videos/${encodeURIComponent(t.videoPath)}`
                          }
                          controls
                          className="max-h-64 w-full max-w-md rounded-lg border bg-black"
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPlayingId(t.id)}
                        >
                          <Video className="size-4" /> Ver vídeo
                        </Button>
                      )}
                    </div>
                  )}
                  {t.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 md:flex-col">
                  {t.status === "pendente" ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-success text-success-foreground hover:bg-success/90"
                        disabled={busyId === t.id}
                        onClick={() => moderate(t.id, "aprovado")}
                      >
                        <Check className="size-4" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === t.id}
                        onClick={() => moderate(t.id, "recusado")}
                      >
                        <X className="size-4" /> Recusar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/widgets">Usar em widget</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
