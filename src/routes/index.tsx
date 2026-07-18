import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Play } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/stars";
import type { Testimonial } from "@/lib/types";
import { getLandingTestimonials } from "@/lib/testimonials";

export const Route = createFileRoute("/")({
  loader: () => getLandingTestimonials(),
  head: () => ({
    meta: [
      { title: "ProofTaker — Depoimentos que fecham venda" },
      {
        name: "description",
        content:
          "Colete depoimentos em texto e vídeo e exiba um mural de confiança no seu site. Feito para o Brasil.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const featured = Route.useLoaderData();
  const wall = featured.length > 0 ? featured : FALLBACK_QUOTES;

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-foreground">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/70 md:flex">
            <a href="#mural" className="hover:text-foreground">
              Mural
            </a>
            <a href="#fluxo" className="hover:text-foreground">
              Como funciona
            </a>
            <a href="#precos" className="hover:text-foreground">
              Preços
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" className="bg-[#0f3d3a] text-white hover:bg-[#0f3d3a]/90" asChild>
              <Link to="/cadastro">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — brand + one idea + Wall as visual plane */}
      <section className="relative min-h-[100svh] overflow-hidden landing-grid">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block">
          <HeroWall columns={splitColumns(wall, 3)} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f4f7f6] via-[#f4f7f6]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f4f7f6] to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-16 pt-28 md:px-6 md:pb-24">
          <div className="max-w-xl animate-fade-up">
            <p className="font-display text-sm font-semibold tracking-[0.18em] text-[#0f3d3a]/70 uppercase">
              ProofTaker
            </p>
            <h1 className="mt-4 font-display text-[2.65rem] font-extrabold leading-[1.05] tracking-tight text-[#0b1f1e] md:text-6xl lg:text-[4.25rem]">
              Clientes falam.
              <br />
              <span className="text-brand-gradient">Seu site vende.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[#0b1f1e]/65">
              Colete depoimentos em texto e vídeo e mostre um mural de confiança
              onde o visitante decide comprar.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-12 bg-[#0f3d3a] px-6 text-base text-white hover:bg-[#0f3d3a]/90"
                asChild
              >
                <Link to="/cadastro">
                  Criar conta grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-[#0f3d3a]/20 bg-white/60 px-6 text-base backdrop-blur"
                asChild
              >
                <a href="#mural">Ver mural ao vivo</a>
              </Button>
            </div>
          </div>

          {/* Mobile wall strip */}
          <div className="relative mt-14 -mx-4 h-56 overflow-hidden lg:hidden">
            <div className="flex gap-3 px-4 animate-[pt-marquee-up_1s_paused]">
              <div className="flex min-w-max gap-3 animate-[scroll-x_40s_linear_infinite]">
                {[...wall, ...wall].map((t, i) => (
                  <QuoteChip key={`${t.id}-${i}`} t={t} className="w-64 shrink-0" />
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#f4f7f6]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#f4f7f6]" />
          </div>
        </div>
      </section>

      {/* Wall of Love */}
      <section id="mural" className="relative border-y border-[#0f3d3a]/10 bg-[#0b1f1e] py-20 text-white md:py-28">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
              Seu site vende com as palavras de quem já comprou.
            </h2>
            <p className="mt-4 text-lg text-white/65">
              Um mural de depoimentos no seu site — texto, vídeo e aprovação
              antes de publicar.
            </p>
          </div>
        </div>
        <div className="mt-12 columns-1 gap-4 px-4 sm:columns-2 sm:px-6 lg:columns-3 xl:mx-auto xl:max-w-6xl [&>*]:mb-4">
          {wall.map((t) => (
            <QuoteChip key={t.id} t={t} dark />
          ))}
        </div>
      </section>

      {/* Fluxo */}
      <section id="fluxo" className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#0b1f1e] md:text-4xl">
              Um link. Uma mensagem. Um depoimento.
            </h2>
            <p className="mt-4 text-lg text-[#0b1f1e]/65">
              Gere o pedido, envie o link, aprove no painel e publique no mural.
              Sem planilha. Sem print perdido no celular.
            </p>
            <ol className="mt-10 space-y-6">
              {[
                {
                  t: "Gera o pedido",
                  d: "Template pronto ou mensagem com IA — tom brasileiro, direto.",
                },
                {
                  t: "Cliente grava ou escreve",
                  d: "Formulário no celular: texto, vídeo pela câmera, e-mail opcional.",
                },
                {
                  t: "Você aprova e publica",
                  d: "Painel limpo + mural ou carrossel no seu site.",
                },
              ].map((step, i) => (
                <li key={step.t} className="flex gap-4">
                  <span className="font-display text-2xl font-bold text-[#2A9D8F] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold text-[#0b1f1e]">
                      {step.t}
                    </p>
                    <p className="mt-1 text-[#0b1f1e]/60">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <RequestMock />
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#0b1f1e] md:text-4xl">
            Preço em real. Sem surpresa em dólar.
          </h2>
          <p className="mt-4 text-lg text-[#0b1f1e]/65">
            Comece grátis. Suba quando o mural virar parte do funil.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#0f3d3a]/15 bg-[#0f3d3a]/15 md:grid-cols-3">
          {[
            {
              name: "Free",
              price: "R$ 0",
              note: "para sempre",
              features: [
                "15 depoimentos",
                "1 projeto",
                "Mural e widgets",
                "Marca ProofTaker",
              ],
              cta: "Começar grátis",
              to: "/cadastro" as const,
              dark: false,
            },
            {
              name: "Starter",
              price: "R$ 49",
              note: "ou R$ 470/ano",
              features: [
                "Depoimentos ilimitados",
                "1 projeto",
                "Sem marca no mural",
                "Links mágicos + IA",
              ],
              cta: "Assinar Starter",
              to: "/billing" as const,
              dark: true,
            },
            {
              name: "Pro",
              price: "R$ 99",
              note: "ou R$ 950/ano",
              features: [
                "Tudo do Starter",
                "Até 5 projetos",
                "Slack e Zapier",
                "Suporte prioritário",
              ],
              cta: "Assinar Pro",
              to: "/billing" as const,
              dark: false,
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`p-8 md:p-10 ${
                tier.dark ? "bg-[#0f3d3a] text-white" : "bg-[#f4f7f6] text-[#0b1f1e]"
              }`}
            >
              <p
                className={`text-sm font-semibold tracking-wide uppercase ${
                  tier.dark ? "text-white/70" : "text-[#0f3d3a]/70"
                }`}
              >
                {tier.name}
              </p>
              <p className="mt-3 font-display text-5xl font-bold">
                {tier.price}
                {tier.name !== "Free" ? (
                  <span
                    className={`text-lg font-medium ${
                      tier.dark ? "text-white/55" : "text-[#0b1f1e]/55"
                    }`}
                  >
                    /mês
                  </span>
                ) : null}
              </p>
              <p
                className={`mt-1 ${
                  tier.dark ? "text-white/55" : "text-[#0b1f1e]/55"
                }`}
              >
                {tier.note}
              </p>
              <ul
                className={`mt-8 space-y-3 text-[15px] ${
                  tier.dark ? "text-white/90" : "text-[#0b1f1e]/80"
                }`}
              >
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${
                        tier.dark ? "text-[#7dcfb6]" : "text-[#2A9D8F]"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-10 w-full ${
                  tier.dark
                    ? "bg-white text-[#0f3d3a] hover:bg-white/90"
                    : tier.name === "Free"
                      ? ""
                      : "bg-[#0f3d3a] text-white hover:bg-[#0f3d3a]/90"
                }`}
                variant={tier.name === "Free" ? "outline" : "default"}
                asChild
              >
                <Link to={tier.to}>{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#0f3d3a]/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-[#0b1f1e]/55">
              Prova social para quem vende no Brasil.
            </p>
          </div>
          <p className="text-sm text-[#0b1f1e]/45">© 2026 ProofTaker</p>
        </div>
      </footer>

      <style>{`
        @keyframes scroll-x {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function HeroWall({
  columns,
}: {
  columns: Testimonial[][];
}) {
  return (
    <div className="flex h-full gap-3 p-6 pt-24">
      {columns.map((col, i) => (
        <div key={i} className="relative flex-1 overflow-hidden">
          <div
            className={
              i % 2 === 0 ? "animate-marquee-up space-y-3" : "animate-marquee-down space-y-3"
            }
          >
            {[...col, ...col].map((t, j) => (
              <QuoteChip key={`${t.id}-${j}`} t={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuoteChip({
  t,
  dark = false,
  className = "",
}: {
  t: Testimonial;
  dark?: boolean;
  className?: string;
}) {
  return (
    <article
      className={`break-inside-avoid rounded-2xl p-5 ${
        dark
          ? "border border-white/10 bg-white/5"
          : "border border-[#0f3d3a]/10 bg-white/90 shadow-soft backdrop-blur"
      } ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Stars rating={t.rating} size={14} />
        {t.hasVideo ? (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              dark ? "text-white/50" : "text-[#0f3d3a]/50"
            }`}
          >
            <Play className="size-3 fill-current" />
            Vídeo
          </span>
        ) : null}
      </div>
      <p
        className={`text-[15px] leading-relaxed ${
          dark ? "text-white/90" : "text-[#0b1f1e]/85"
        }`}
      >
        “{t.text}”
      </p>
      <div className={`mt-4 flex items-center gap-3 ${dark ? "text-white/55" : "text-[#0b1f1e]/50"}`}>
        <div
          className={`grid size-8 place-items-center rounded-full text-xs font-semibold ${
            dark ? "bg-white/10 text-white" : "bg-[#0f3d3a]/10 text-[#0f3d3a]"
          }`}
        >
          {t.name.charAt(0)}
        </div>
        <div className="min-w-0 text-xs">
          <p className={`truncate font-semibold ${dark ? "text-white/80" : "text-[#0b1f1e]/75"}`}>
            {t.name}
          </p>
          <p className="truncate">
            {t.role}
            {t.company ? ` · ${t.company}` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

function RequestMock() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#0f3d3a]/15 bg-white shadow-[0_24px_80px_-24px_rgba(15,61,58,0.45)]">
        <div className="flex items-center gap-3 border-b border-[#0f3d3a]/10 bg-[#0f3d3a] px-4 py-3 text-white">
          <div className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-bold">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Pedido para Ana</p>
            <p className="text-[11px] text-white/70">link mágico · 1 uso</p>
          </div>
        </div>
        <div className="space-y-3 bg-[#f4f7f6] px-4 py-5">
          <div className="rounded-2xl border border-[#0f3d3a]/10 bg-white px-3 py-2 text-[13px] leading-snug text-[#0b1f1e] shadow-sm">
            Oi Ana! Pode deixar um depoimento rápido? Leva menos de 1 minuto.
            <br />
            <a className="font-medium text-[#2A9D8F] underline" href="/coletar/ana-design">
              prooftaker.app/c/a8f3…
            </a>
          </div>
          <div className="rounded-2xl border border-[#0f3d3a]/10 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold tracking-wide text-[#0f3d3a]/55 uppercase">
              Novo no painel
            </p>
            <p className="mt-1 text-sm font-medium text-[#0b1f1e]">
              “O site ficou impecável e a entrega foi no prazo.”
            </p>
            <p className="mt-2 text-xs text-[#0b1f1e]/50">Marina Costa · aguardando aprovação</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function splitColumns(items: Testimonial[], n: number) {
  const cols: Testimonial[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => {
    cols[i % n].push(item);
  });
  return cols.map((c) => (c.length ? c : items.slice(0, 2)));
}

const FALLBACK_QUOTES: Testimonial[] = [
  {
    id: "f1",
    projectId: "demo",
    name: "Marina Costa",
    role: "Fundadora",
    company: "Ateliê Norte",
    text: "Em 10 minutos o depoimento já estava no site. Mudou a conversão da landing.",
    rating: 5,
    status: "aprovado",
    hasVideo: false,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "f2",
    projectId: "demo",
    name: "Rafael Souza",
    role: "CEO",
    company: "Orbit Labs",
    text: "Troquei prints soltos por um mural de verdade. O cliente grava o vídeo no celular sem enrolação.",
    rating: 5,
    status: "aprovado",
    hasVideo: true,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "f3",
    projectId: "demo",
    name: "Juliana Alves",
    role: "Marketing",
    company: "Casa Viva",
    text: "O link mágico com prazo me deu controle. Mandei só para quem fechou na semana.",
    rating: 5,
    status: "aprovado",
    hasVideo: false,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "f4",
    projectId: "demo",
    name: "Pedro Lima",
    role: "Freelancer",
    company: "Design",
    text: "Preço em real, mural simples e aprovação antes de publicar. Era o que eu precisava.",
    rating: 5,
    status: "aprovado",
    hasVideo: false,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "f5",
    projectId: "demo",
    name: "Camila Rocha",
    role: "Head de Growth",
    company: "NuvemPay",
    text: "Mural no site e Slack avisando cada novo depoimento. Time comercial ama.",
    rating: 5,
    status: "aprovado",
    hasVideo: true,
    tags: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "f6",
    projectId: "demo",
    name: "Thiago Mendes",
    role: "Sócio",
    company: "Clínica Alma",
    text: "Antes eu pedia avaliação e esquecia. Agora o pedido já sai com mensagem pronta.",
    rating: 5,
    status: "aprovado",
    hasVideo: false,
    tags: [],
    createdAt: new Date().toISOString(),
  },
].map((t) => ({ ...t, textOriginal: t.text }));
