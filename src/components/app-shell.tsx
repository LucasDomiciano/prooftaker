import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  Blocks,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { logoutFn } from "@/lib/auth";
import type { PublicUser } from "@/lib/types";

const nav = [
  { to: "/dashboard", label: "Depoimentos", icon: LayoutDashboard },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/pedir-avaliacao", label: "Pedir avaliação", icon: Sparkles },
  { to: "/widgets", label: "Widgets", icon: Blocks },
  { to: "/billing", label: "Plano & Cobrança", icon: CreditCard },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({
  children,
  title,
  user,
}: {
  children: ReactNode;
  title?: string;
  user: PublicUser;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutFn();
      await router.navigate({ to: "/" });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-surface-elevated/90 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-md hover:bg-accent"
          aria-label="Abrir menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      <div className="flex">
        <aside
          className={`${
            open ? "block" : "hidden"
          } fixed inset-x-0 top-14 z-20 border-b bg-surface-elevated p-4 md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r md:p-6`}
        >
          <div className="mb-8 hidden md:block">
            <Logo />
          </div>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-xl border bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-brand-gradient font-semibold text-primary-foreground">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Plano {user.plan}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut className="size-4" />
              {loggingOut ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {title && (
            <div className="border-b bg-surface-elevated px-4 py-6 md:px-10">
              <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                {title}
              </h1>
            </div>
          )}
          <div className="px-4 py-6 md:px-10 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
