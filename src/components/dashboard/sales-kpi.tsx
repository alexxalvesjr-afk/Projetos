import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatDelta } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/dashboard/sparkline";

/**
 * One of the three headline numbers.
 *
 * The value dominates; the sparkline beside it only carries direction, and the
 * line underneath says what the number is made of — "2 vendas no período" turns
 * an abstract figure into something the reader can verify against their day.
 */
export function SalesKpi({
  label,
  value,
  hint,
  badge,
  delta = null,
  series,
  tone = "var(--chart-1)",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  badge?: string;
  delta?: number | null;
  series: number[];
  tone?: string;
}) {
  const isUp = delta !== null && delta > 0;
  const isDown = delta !== null && delta < 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-[13px] font-medium">{label}</p>
            {delta !== null ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                  isUp && "bg-success/12 text-success",
                  isDown && "bg-destructive/12 text-destructive",
                  !isUp && !isDown && "bg-muted text-muted-foreground",
                )}
              >
                {formatDelta(delta)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <p className="tabular truncate text-[28px] leading-none font-semibold tracking-[-0.03em]">
              {value}
            </p>
            {badge ? (
              <span className="bg-success/12 text-success rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
                {badge}
              </span>
            ) : null}
          </div>

          <p className="text-muted-foreground truncate text-xs">{hint}</p>
        </div>

        <Sparkline values={series} tone={tone} className="mt-1 shrink-0" />
      </div>
    </Card>
  );
}
