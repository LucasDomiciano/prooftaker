import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, loginFn, startGoogleOAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    error: z.string().optional(),
  }),
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Entrar · ProofTaker" },
      {
        name: "description",
        content: "Acesse sua conta ProofTaker para gerenciar depoimentos e widgets.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(search.error ?? null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Bem-vinda de volta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para ver os depoimentos dos seus clientes.
          </p>

          <Button
            variant="outline"
            className="mt-8 w-full"
            size="lg"
            disabled={googleLoading}
            onClick={async () => {
              setError(null);
              setGoogleLoading(true);
              try {
                const result = await startGoogleOAuth();
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                window.location.href = result.url;
              } catch {
                setError("Não foi possível iniciar o Google login.");
              } finally {
                setGoogleLoading(false);
              }
            }}
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.5 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.7 3.2-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"
              />
              <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.4V7H2.1a11 11 0 0 0 0 10z" />
              <path
                fill="#EA4335"
                d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"
              />
            </svg>
            {googleLoading ? "Redirecionando..." : "Entrar com Google"}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            OU
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                const result = await loginFn({ data: { email, password } });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                await navigate({ to: "/dashboard" });
              } catch {
                setError("Não foi possível entrar. Tente novamente.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-brand-gradient"
              size="lg"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">
              Criar grátis
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-gradient p-10 text-primary-foreground md:flex md:flex-col md:justify-end">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 40%)",
          }}
        />
        <blockquote className="relative max-w-md">
          <p className="font-display text-2xl font-semibold leading-snug">
            "Depois que instalei o widget do ProofTaker na home, minha conversão subiu
            34%. Meus clientes viraram meu melhor time de vendas."
          </p>
          <footer className="mt-6 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-white/20 font-semibold">
              M
            </div>
            <div>
              <p className="font-semibold">Mariana Ribeiro</p>
              <p className="text-sm opacity-80">Fundadora · Café da Vila</p>
            </div>
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
