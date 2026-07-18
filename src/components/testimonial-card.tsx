import { Play } from "lucide-react";
import { Stars } from "@/components/stars";
import type { Testimonial } from "@/lib/types";

export function TestimonialCard({
  t,
  projectName,
  showStars = true,
}: {
  t: Testimonial;
  projectName?: string;
  showStars?: boolean;
}) {
  return (
    <article className="break-inside-avoid rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        {showStars ? <Stars rating={t.rating} /> : <span />}
        {t.hasVideo && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            <Play className="size-3 fill-current" />
            Vídeo
          </span>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-foreground">"{t.text}"</p>
      <div className="mt-4 flex items-center gap-3 border-t pt-4">
        <div className="grid size-10 place-items-center rounded-full bg-brand-soft font-semibold text-primary">
          {t.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{t.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t.role} · {t.company}
          </p>
        </div>
        {projectName && (
          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
            {projectName}
          </span>
        )}
      </div>
    </article>
  );
}
