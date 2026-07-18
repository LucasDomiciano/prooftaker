import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Copy,
  Check,
  Link2,
  Mail,
  MessageCircle,
  Sparkles,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadProjetosPage } from "@/lib/app-loaders";
import { createCollectLink, listCollectLinks } from "@/lib/collect-links";
import { generateReviewRequest } from "@/lib/ai.server";
import type { CollectLink } from "@/lib/types";

export const Route = createFileRoute("/pedir-avaliacao")({
  loader: async () => {
    const data = await loadProjetosPage();
    const firstId = data.projects[0]?.id;
    const links = firstId
      ? await listCollectLinks({ data: { projectId: firstId } })
      : [];
    return { ...data, initialLinks: links };
  },
  head: () => ({ meta: [{ title: "Pedir avaliação · ProofTaker" }] }),
  component: AskReviewPage,
});

function AskReviewPage() {
  const { user, projects, initialLinks } = Route.useLoaderData();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [links, setLinks] = useState<CollectLink[]>(initialLinks);
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [tone, setTone] = useState<"amigavel" | "formal" | "curto">("amigavel");
  const [customerName, setCustomerName] = useState("");
  const [context, setContext] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<"ai" | "template" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkLabel, setLinkLabel] = useState("Cliente VIP");

  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const collectUrl = useMemo(() => {
    if (!project) return "";
    const magic = links[0];
    if (magic) return `${origin}/c/${magic.token}`;
    return `${origin}/coletar/${project.slug}`;
  }, [project, links, origin]);

  const refreshLinks = async (id: string) => {
    const next = await listCollectLinks({ data: { projectId: id } });
    setLinks(next);
  };

  if (!project) {
    return (
      <AppShell title="Pedir avaliação" user={user}>
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">Crie um projeto primeiro.</p>
          <Button className="mt-4 bg-brand-gradient" asChild>
            <Link to="/projetos/novo">Criar projeto</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pedir avaliação" user={user}>
      <p className="mb-6 text-sm text-muted-foreground">
        Gere links mágicos e mensagens prontas (WhatsApp / e-mail) com IA.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <Label className="mb-2 block">Projeto</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={project.id}
              onChange={async (e) => {
                setProjectId(e.target.value);
                await refreshLinks(e.target.value);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Link2 className="size-4 text-primary" /> Links mágicos
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Links com token único — opcionalmente com limite de usos ou validade.
            </p>
            <div className="mb-3 flex gap-2">
              <Input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Rótulo (ex: Cliente Ana)"
              />
              <Button
                type="button"
                className="bg-brand-gradient shrink-0"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const result = await createCollectLink({
                      data: {
                        projectId: project.id,
                        label: linkLabel,
                        maxUses: 1,
                        expiresInDays: 30,
                      },
                    });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    await refreshLinks(project.id);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Plus className="size-4" /> Criar
              </Button>
            </div>
            <ul className="space-y-2">
              {links.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Nenhum link mágico ainda. O link padrão do projeto continua
                  funcionando.
                </li>
              )}
              {links.map((l) => {
                const url = `${origin}/c/${l.token}`;
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-md border bg-surface px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono">{url}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        await navigator.clipboard.writeText(url);
                      }}
                      aria-label="Copiar"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 break-all text-xs text-muted-foreground">
              Link ativo para mensagem:{" "}
              <span className="font-mono text-foreground">{collectUrl}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-primary" /> Modelo de solicitação
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm ${
                channel === "whatsapp"
                  ? "border-primary bg-brand-soft text-primary"
                  : ""
              }`}
            >
              <MessageCircle className="size-4" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm ${
                channel === "email"
                  ? "border-primary bg-brand-soft text-primary"
                  : ""
              }`}
            >
              <Mail className="size-4" /> E-mail
            </button>
          </div>

          <div className="mb-4 space-y-3">
            <div className="space-y-2">
              <Label>Tom</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={tone}
                onChange={(e) =>
                  setTone(e.target.value as "amigavel" | "formal" | "curto")
                }
              >
                <option value="amigavel">Amigável</option>
                <option value="formal">Formal</option>
                <option value="curto">Curto</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nome do cliente (opcional)</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ana"
              />
            </div>
            <div className="space-y-2">
              <Label>Contexto (opcional)</Label>
              <Textarea
                rows={2}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: acabamos o site dela na semana passada"
              />
            </div>
          </div>

          <Button
            className="mb-4 w-full bg-brand-gradient"
            disabled={busy || !collectUrl}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const result = await generateReviewRequest({
                  data: {
                    projectName: project.name,
                    collectUrl,
                    channel,
                    tone,
                    customerName: customerName || undefined,
                    context: context || undefined,
                  },
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setMode(result.mode);
                setMessage(result.message);
                if (result.channel === "email" && "subject" in result) {
                  setSubject(result.subject);
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            <Sparkles className="size-4" />
            {busy ? "Gerando..." : "Gerar mensagem"}
          </Button>

          {mode && (
            <p className="mb-2 text-xs text-muted-foreground">
              Gerado via {mode === "ai" ? "IA (OpenAI)" : "modelo pronto"}
              {mode === "template"
                ? " — defina OPENAI_API_KEY no .env para personalizar com IA"
                : ""}
            </p>
          )}

          {channel === "email" && (
            <div className="mb-3 space-y-2">
              <Label>Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Clique em Gerar mensagem"
            />
          </div>

          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!message}
              onClick={async () => {
                const text =
                  channel === "email" && subject
                    ? `Assunto: ${subject}\n\n${message}`
                    : message;
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              Copiar
            </Button>
            {channel === "whatsapp" && message && (
              <Button type="button" className="bg-brand-gradient" asChild>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="size-4" /> Abrir WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
