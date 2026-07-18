import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { Quote } from "lucide-react";
import { z } from "zod";
import { TestimonialCard } from "@/components/testimonial-card";
import { Stars } from "@/components/stars";
import { getEmbedData } from "@/lib/testimonials";

const searchSchema = z.object({
  type: z.enum(["wall", "carousel", "single"]).catch("wall"),
  count: z.coerce.number().int().min(1).max(24).catch(6),
  stars: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .catch(true)
    .transform((v) => v === true || v === "true"),
  accent: z.string().optional(),
});

export const Route = createFileRoute("/embed/$slug")({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    type: search.type,
    count: search.count,
    stars: search.stars,
    accent: search.accent,
  }),
  loader: async ({ params, deps }) => {
    const data = await getEmbedData({
      data: { slug: params.slug, count: deps.count },
    });
    if (!data) throw notFound();
    return { data, search: deps };
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }, { title: "Widget ProofTaker" }],
  }),
  component: EmbedPage,
});

function EmbedPage() {
  const { data, search } = Route.useLoaderData();
  const { testimonials, showBranding, project } = data;
  const accent = search.accent || project.color;

  useEffect(() => {
    const post = () => {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      );
      parent.postMessage(
        { source: "prooftaker-embed", type: "resize", height },
        "*",
      );
    };
    post();
    const t1 = setTimeout(post, 200);
    const t2 = setTimeout(post, 800);
    window.addEventListener("resize", post);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", post);
    };
  }, [testimonials, search.type]);

  return (
    <div
      className="bg-transparent p-3"
      style={{ ["--embed-accent" as string]: accent }}
    >
      {testimonials.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum depoimento aprovado ainda.
        </p>
      ) : search.type === "wall" ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} showStars={search.stars} />
          ))}
        </div>
      ) : search.type === "carousel" ? (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
          {testimonials.map((t) => (
            <div key={t.id} className="w-[280px] shrink-0 snap-start">
              <TestimonialCard t={t} showStars={search.stars} />
            </div>
          ))}
        </div>
      ) : (
        testimonials[0] && (
          <div className="mx-auto max-w-2xl rounded-3xl border bg-card p-8 text-center shadow-glow">
            <Quote className="mx-auto size-8 text-primary" />
            {search.stars && (
              <div className="mt-4 flex justify-center">
                <Stars rating={testimonials[0].rating} size={22} />
              </div>
            )}
            <p className="mt-4 font-display text-xl leading-relaxed md:text-2xl">
              "{testimonials[0].text}"
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="grid size-12 place-items-center rounded-full bg-brand-soft font-semibold text-primary">
                {testimonials[0].name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="font-semibold">{testimonials[0].name}</p>
                <p className="text-sm text-muted-foreground">
                  {testimonials[0].role} · {testimonials[0].company}
                </p>
              </div>
            </div>
          </div>
        )
      )}

      {showBranding && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Feito com <span className="font-semibold text-primary">ProofTaker</span>
        </p>
      )}
    </div>
  );
}
