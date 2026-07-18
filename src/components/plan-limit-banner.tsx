import { Link } from "@tanstack/react-router";
import { FREE_PROJECT_LIMIT, FREE_TESTIMONIAL_LIMIT, type Plan } from "@/lib/types";
import { projectLimitFor, testimonialLimitFor } from "@/lib/plans";

export function PlanLimitBanner({
  plan,
  usedTestimonials,
  projectCount,
}: {
  plan: Plan;
  usedTestimonials: number;
  projectCount?: number;
}) {
  if (plan !== "Free") {
    const pLimit = projectLimitFor(plan);
    if (
      plan === "Starter" &&
      typeof projectCount === "number" &&
      pLimit != null &&
      projectCount >= pLimit
    ) {
      return (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          Plano Starter: {pLimit} projeto.{" "}
          <Link to="/billing" className="font-semibold underline">
            Suba para Pro e gerencie até 5
          </Link>
          .
        </div>
      );
    }
    return null;
  }

  const tLimit = testimonialLimitFor("Free") ?? FREE_TESTIMONIAL_LIMIT;
  const pLimit = projectLimitFor("Free") ?? FREE_PROJECT_LIMIT;
  const nearLimit = usedTestimonials >= tLimit - 2;
  const atLimit = usedTestimonials >= tLimit;
  const atProjectLimit =
    typeof projectCount === "number" && projectCount >= pLimit;

  if (!nearLimit && !atLimit && !atProjectLimit) return null;

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        atLimit
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-warning/40 bg-warning/10 text-warning-foreground"
      }`}
    >
      {atLimit ? (
        <>
          Você atingiu o limite de {tLimit} depoimentos do plano Free.{" "}
          <Link to="/billing" className="font-semibold underline">
            Faça upgrade para Starter
          </Link>
          .
        </>
      ) : nearLimit ? (
        <>
          Você usou {usedTestimonials} de {tLimit} depoimentos.{" "}
          <Link to="/billing" className="font-semibold underline">
            Conheça o Starter
          </Link>
          .
        </>
      ) : (
        <>
          Plano Free: {pLimit} projeto.{" "}
          <Link to="/billing" className="font-semibold underline">
            Upgrade para mais projetos
          </Link>
          .
        </>
      )}
    </div>
  );
}
