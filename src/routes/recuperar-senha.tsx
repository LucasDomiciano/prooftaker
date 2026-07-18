import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [{ title: "Recuperar senha · ProofTaker" }],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
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
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviaremos um link para redefinir sua senha.
        </p>

        {sent ? (
          <p className="mt-6 rounded-lg bg-brand-soft p-4 text-sm text-foreground">
            Se existir uma conta com este e-mail, o link foi enviado. Confira também
            o spam.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                const result = await requestPasswordReset({ data: { email } });
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
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
