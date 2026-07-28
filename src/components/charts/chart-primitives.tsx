"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The categorical series order. Assigned in this fixed sequence and never
 * cycled — a ninth series folds into "Outros" rather than reusing a hue.
 */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export function seriesColor(index: number): string {
  return CHART_SERIES[index] ?? "var(--muted-foreground)";
}

/** Recessive axis/grid styling shared by every chart in the product. */
export const AXIS_PROPS = {
  stroke: "var(--border)",
  tickLine: false,
  axisLine: false,
  tick: {
    fill: "var(--muted-foreground)",
    fontSize: 11,
  },
} as const;

export const GRID_PROPS = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
  opacity: 0.7,
} as const;

type TooltipRow = {
  label: string;
  value: string;
  color?: string;
};

/**
 * One entry of a Recharts tooltip payload, narrowed to the fields charts here
 * actually read. Declaring it structurally rather than importing Recharts'
 * generic `TooltipProps` keeps this component usable from the `content` render
 * prop, which hands back the widest possible value/name types.
 */
export type ChartTooltipItem = {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

/**
 * Shared tooltip shell. Charts pass a `rows` mapper that turns the raw payload
 * into display rows, so number formatting stays in one place per chart rather
 * than being reimplemented per series.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  rows,
}: {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: string | number;
  title?: string;
  rows: (payload: ChartTooltipItem[]) => TooltipRow[];
}) {
  if (!active || !payload?.length) return null;

  const items = rows(payload);
  if (items.length === 0) return null;

  return (
    <div className="bg-popover min-w-40 rounded-xl border p-3 shadow-lg">
      <p className="text-muted-foreground mb-2 text-xs font-medium">
        {title ?? String(label ?? "")}
      </p>
      <div className="space-y-1.5">
        {items.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              {row.color ? (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}
              {row.label}
            </span>
            {/* Values wear text tokens; the swatch beside them carries identity. */}
            <span className="tabular font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Legend. Always rendered for two or more series so identity is never conveyed
 * by colour alone.
 */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <li
          key={item.label}
          className="text-muted-foreground flex items-center gap-1.5 text-xs"
        >
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Consistent empty slot so a chart never collapses to zero height. */
export function ChartEmpty({
  message = "Sem dados no período",
  height = 280,
}: {
  message?: string;
  height?: number;
}) {
  return (
    <div
      className="text-muted-foreground flex items-center justify-center text-sm"
      style={{ height }}
    >
      {message}
    </div>
  );
}
