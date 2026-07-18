import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordFn } from "@/lib/auth";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [{ title: "Redefinir senha · ProofTaker" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Login
          </Link>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          Nova senha
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Digite a nova senha da sua conta.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (password !== confirm) {
              setError("As senhas não coincidem.");
              return;
            }
            setLoading(true);
            try {
              const result = await updatePasswordFn({ data: { password } });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              await navigate({ to: "/dashboard" });
            } catch {
              setError("Não foi possível atualizar. Abra o link do e-mail novamente.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
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
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
