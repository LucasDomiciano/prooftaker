import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  /** `badge` = ícone no fundo gradiente (nav); `mark` = SVG colorido standalone */
  variant?: "badge" | "mark";
  title?: string;
};

/**
 * Símbolo ProofTaker: balão de depoimento + selo de verificação.
 * Coletar a voz do cliente e transformá-la em prova social.
 */
export function BrandMark({
  className,
  variant = "badge",
  title = "ProofTaker",
}: BrandMarkProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("size-8", className)}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <defs>
          <linearGradient
            id="pt-mark-grad"
            x1="4"
            y1="2"
            x2="28"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#2A9D8F" />
            <stop offset="1" stopColor="#3D5A80" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#pt-mark-grad)" />
        <path
          d="M8.2 8h12c2.1 0 3.8 1.7 3.8 3.8v5c0 2.1-1.7 3.8-3.8 3.8h-4.6l-3.2 2.9c-.52.47-1.33.1-1.33-.62V20.6H8.2c-2.1 0-3.8-1.7-3.8-3.8v-5C4.4 9.7 6.1 8 8.2 8Z"
          fill="white"
          fillOpacity="0.96"
        />
        <path
          d="M10.6 12.4h6.4M10.6 15.4h4.2"
          stroke="#2A9D8F"
          strokeWidth="1.65"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="23.4" cy="22.6" r="5.5" fill="white" />
        <circle cx="23.4" cy="22.6" r="4.15" fill="#3D5A80" />
        <path
          d="M21.15 22.7l1.4 1.4 3-3.2"
          stroke="white"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-brand-gradient text-primary-foreground shadow-glow",
        className,
      )}
      role="img"
      aria-label={title}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-[1.35rem]"
        aria-hidden
      >
        <path
          d="M7.8 7.2h12.2c2.2 0 4 1.8 4 4v5.4c0 2.2-1.8 4-4 4h-5l-3.5 3.2c-.55.5-1.4.12-1.4-.66V20.6H7.8c-2.2 0-4-1.8-4-4v-5.4c0-2.2 1.8-4 4-4Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M10.6 12.2h6.8M10.6 15.4h4.6"
          stroke="oklch(0.42 0.12 200)"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.4"
        />
        <circle cx="23.5" cy="22.8" r="5.7" fill="white" />
        <circle cx="23.5" cy="22.8" r="4.25" fill="oklch(0.38 0.12 235)" />
        <path
          d="M21.2 22.9l1.45 1.45 3.15-3.35"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
