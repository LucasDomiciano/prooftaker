import { Star } from "lucide-react";

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={
            i < rating
              ? "fill-warning text-warning"
              : "fill-transparent text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}
