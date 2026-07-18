import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount, updateProfile } from "@/lib/profile";
import { updateIntegrations } from "@/lib/integrations";
import { loadConfigPage } from "@/lib/app-loaders";
import { WEBHOOK_EVENTS, type OutboundWebhook } from "@/lib/types";

export const Route = createFileRoute("/configuracoes")({
  loader: () => loadConfigPage(),
  head: () => ({ meta: [{ title: "Configurações · ProofTaker" }] }),
  component: Settings,
});

function Settings() {
  const { user } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [company, setCompany] = useState(user.company);
  const [email, setEmail] = useState(user.email);
  const [notifyNew, setNotifyNew] = useState(user.notifyNew);
  const [notifyWeekly, setNotifyWeekly] = useState(user.notifyWeekly);
  const [notifyProduct, setNotifyProduct] = useState(user.notifyProduct);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(
    user.slackWebhookUrl || "",
  );
  const [zapierUrl, setZapierUrl] = useState(
    user.outboundWebhooks?.[0]?.url || "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <AppShell title="Configurações" user={user}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
          <h2 className="font-display text-lg font-semibold">Perfil</h2>
          <div className="mt-6 flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-brand-gradient text-2xl font-bold text-primary-foreground">
              {name.charAt(0) || user.name.charAt(0)}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              className="bg-brand-gradient"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError(null);
                setMessage(null);
                try {
                  const result = await updateProfile({
                    data: {
                      name,
                      company,
                      email,
                      notifyNew,
                      notifyWeekly,
                      notifyProduct,
                    },
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage("Alterações salvas.");
                  await router.invalidate();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
          <h2 className="font-display text-lg font-semibold">Notificações</h2>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notifyNew}
                onChange={(e) => setNotifyNew(e.target.checked)}
                className="size-4 accent-primary"
              />
              Receber e-mail quando um novo depoimento chegar
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notifyWeekly}
                onChange={(e) => setNotifyWeekly(e.target.checked)}
                className="size-4 accent-primary"
              />
              Resumo semanal de depoimentos
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notifyProduct}
                onChange={(e) => setNotifyProduct(e.target.checked)}
                className="size-4 accent-primary"
              />
              Novidades e atualizações do ProofTaker
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Preferências salvas no perfil.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
          <h2 className="font-display text-lg font-semibold">
            Integrações · Slack & Zapier
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Receba avisos no Slack e dispare automações no Zapier quando um
            depoimento for criado ou moderado. Disponível no plano Pro.
          </p>
          {user.plan !== "Pro" ? (
            <div className="mt-4 rounded-xl border border-primary/20 bg-brand-soft px-4 py-3 text-sm">
              Seu plano atual é {user.plan}.{" "}
              <Link to="/billing" className="font-semibold text-primary underline">
                Assine o Pro
              </Link>{" "}
              para liberar integrações.
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slack">Slack Incoming Webhook</Label>
              <Input
                id="slack"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-xs text-muted-foreground">
                Crie um Incoming Webhook no Slack e cole a URL aqui.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zapier">Zapier Catch Hook (HTTPS)</Label>
              <Input
                id="zapier"
                value={zapierUrl}
                onChange={(e) => setZapierUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
              <p className="text-xs text-muted-foreground">
                Eventos: {WEBHOOK_EVENTS.join(", ")}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              className="bg-brand-gradient"
              disabled={savingIntegrations}
              onClick={async () => {
                setSavingIntegrations(true);
                setError(null);
                setMessage(null);
                try {
                  const hooks: OutboundWebhook[] = zapierUrl.trim()
                    ? [
                        {
                          id: user.outboundWebhooks?.[0]?.id || crypto.randomUUID(),
                          url: zapierUrl.trim(),
                          events: [...WEBHOOK_EVENTS],
                          active: true,
                        },
                      ]
                    : [];
                  const result = await updateIntegrations({
                    data: {
                      slackWebhookUrl,
                      outboundWebhooks: hooks,
                    },
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage("Integrações salvas.");
                  await router.invalidate();
                } finally {
                  setSavingIntegrations(false);
                }
              }}
            >
              {savingIntegrations ? "Salvando..." : "Salvar integrações"}
            </Button>
          </div>
        </div>

        {(message || error) && (
          <p
            className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
            role="status"
          >
            {error ?? message}
          </p>
        )}

        <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-card md:p-8">
          <h2 className="font-display text-lg font-semibold text-destructive">
            Zona de perigo
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Excluir sua conta remove todos os projetos e depoimentos permanentemente.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            disabled={deleting}
            onClick={async () => {
              if (!confirm("Tem certeza que deseja excluir sua conta?")) return;
              setDeleting(true);
              try {
                const result = await deleteAccount();
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                await navigate({ to: "/" });
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? "Excluindo..." : "Excluir conta"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
