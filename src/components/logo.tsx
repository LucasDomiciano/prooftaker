import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function Logo({
  className = "",
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      to="/"
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="ProofTaker"
    >
      <BrandMark />
      {showWordmark ? (
        <span className="font-display text-lg font-bold tracking-tight">
          Proof<span className="text-brand-gradient">Taker</span>
        </span>
      ) : null}
    </Link>
  );
}
