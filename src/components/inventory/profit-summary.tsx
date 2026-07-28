"use client";

import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";
import { calculateProfit, negotiationHeadroom } from "@/lib/domain/vehicle";

/**
 * Live margin readout beside the pricing fields.
 *
 * Showing the consequence of a price while it is being typed is the difference
 * between a dealer discovering a bad deal now and discovering it at closing.
 */
export function ProfitSummary({
  priceCents,
  costCents,
  minPriceCents,
  expensesCents = 0,
  className,
}: {
  priceCents: number;
  costCents: number;
  minPriceCents: number;
  expensesCents?: number;
  className?: string;
}) {
  const { profitCents, marginPercent, roiPercent, totalCostCents } =
    calculateProfit({ priceCents, costCents, expensesCents });

  const { headroomCents, headroomPercent } = negotiationHeadroom(
    priceCents,
    minPriceCents,
  );

  const negative = profitCents < 0;
  const thin = !negative && marginPercent < 8;

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-4",
        negative
          ? "border-destructive/30 bg-destructive/5"
          : thin
            ? "border-warning/30 bg-warning/5"
            : "border-success/25 bg-success/5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium">
            Lucro previsto
          </p>
          <p
            className={cn(
              "tabular mt-0.5 text-2xl leading-none font-semibold tracking-[-0.02em]",
              negative ? "text-destructive" : "text-foreground",
            )}
          >
            {formatCurrency(profitCents)}
          </p>
        </div>

        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
            negative
              ? "bg-destructive/12 text-destructive"
              : thin
                ? "bg-warning/16 text-warning"
                : "bg-success/12 text-success",
          )}
        >
          {negative ? (
            <TrendingDown className="size-3.5" />
          ) : (
            <TrendingUp className="size-3.5" />
          )}
          {formatPercent(marginPercent)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Custo total</dt>
          <dd className="tabular font-medium">
            {formatCurrency(totalCostCents)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">ROI</dt>
          <dd className="tabular font-medium">{formatPercent(roiPercent)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Margem de negociação</dt>
          <dd className="tabular font-medium">
            {formatCurrency(headroomCents)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Desconto máx.</dt>
          <dd className="tabular font-medium">
            {formatPercent(headroomPercent)}
          </dd>
        </div>
      </dl>

      {negative ? (
        <p className="text-destructive flex items-start gap-1.5 text-xs font-medium">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          O preço de venda está abaixo do custo total do veículo.
        </p>
      ) : thin ? (
        <p className="text-warning flex items-start gap-1.5 text-xs font-medium">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          Margem apertada — revise custos ou reajuste o preço.
        </p>
      ) : null}
    </div>
  );
}
