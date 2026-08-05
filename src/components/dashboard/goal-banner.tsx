import Link from "next/link";
import { Trophy } from "lucide-react";

import { clamp, percent } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { goalPace, paceSentence } from "@/lib/domain/goal";
import { Button } from "@/components/ui/button";

/**
 * The month's target, as the first thing on the screen.
 *
 * The percentage is the headline, but the sentence under it is the part that
 * changes what the floor does today: a bare "40%" reads as fine on the 25th and
 * as a disaster on the 3rd. Units rather than revenue, because "3 sales short"
 * is something a team can act on this afternoon.
 */
export function GoalBanner({
  targetUnits,
  soldUnits,
  scope,
  canManage,
}: {
  targetUnits: number;
  soldUnits: number;
  scope: "organization" | "personal";
  canManage: boolean;
}) {
  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  if (targetUnits <= 0) {
    return (
      <div className="bg-muted/60 flex flex-wrap items-center gap-4 rounded-xl border border-dashed px-5 py-4">
        <Trophy className="text-muted-foreground size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Nenhuma meta definida para {monthName}</p>
          <p className="text-muted-foreground text-sm">
            {canManage
              ? "Sem meta, não dá para saber se o mês fecha no ritmo atual."
              : "Peça ao gestor para definir a meta deste mês."}
          </p>
        </div>
        {canManage ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/goals">Definir meta</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const reached = percent(soldUnits, targetUnits);
  const pace = goalPace(soldUnits, targetUnits);

  return (
    <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-start gap-4 px-5 pt-4 pb-5 sm:gap-5">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/20">
          <Trophy className="size-4.5" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[13px] font-medium opacity-90">
            {scope === "organization" ? "Meta da loja" : "Minha meta"} ·{" "}
            <span className="capitalize">{monthName}</span>
          </p>
          <p className="text-lg leading-tight font-semibold">
            <span className="text-2xl">{soldUnits}</span> de {targetUnits} vendas
          </p>
          {pace ? (
            <p className="text-sm leading-relaxed opacity-90">
              {paceSentence(pace, "vendas")}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl leading-none font-semibold tracking-[-0.03em]">
            {formatPercent(reached, { digits: 0 })}
          </p>
          <p className="text-xs opacity-80">da meta</p>
        </div>
      </div>

      {/* Progress reads along the full width of the banner rather than inside a
          card, so the bar length is the month at a glance. */}
      <div
        className="h-1.5 bg-black/25"
        role="progressbar"
        aria-valuenow={Math.round(reached)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da meta do mês"
      >
        <div
          className="h-full bg-white/85 transition-[width] duration-700"
          style={{ width: `${clamp(reached, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}
