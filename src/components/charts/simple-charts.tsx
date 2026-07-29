"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCompact,
  formatCurrencyShort,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { percent } from "@/lib/utils";
import {
  AXIS_PROPS,
  ChartEmpty,
  ChartLegend,
  ChartTooltip,
  GRID_PROPS,
  seriesColor,
  type ChartTooltipItem,
} from "@/components/charts/chart-primitives";

/**
 * How a chart renders its numbers.
 *
 * Deliberately a string rather than a formatter callback: these are client
 * components and every caller is a server component, and React cannot
 * serialise a function across that boundary — `format={(v) => …}` throws at
 * request time and takes the whole page down with it. A key survives the
 * boundary; the lookup happens here, on the client.
 *
 * `currency` expects integer cents, matching how money is stored everywhere.
 */
type ValueFormat = "compact" | "number" | "currency" | "percent";

const FORMATTERS: Record<ValueFormat, (value: number) => string> = {
  compact: (value) => formatCompact(value),
  number: (value) => formatNumber(value),
  currency: (value) => formatCurrencyShort(value),
  percent: (value) => formatPercent(value, { digits: 1 }),
};

/**
 * Horizontal bars for ranked categories. Horizontal because category labels are
 * words — rotating them 45° to fit a vertical axis is what makes most dashboard
 * bar charts unreadable.
 */
export function RankedBarChart({
  data,
  valueLabel = "Valor",
  format = "compact",
  height = 280,
  color = "var(--chart-1)",
}: {
  data: { label: string; value: number }[];
  valueLabel?: string;
  format?: ValueFormat;
  height?: number;
  color?: string;
}) {
  const formatValue = FORMATTERS[format];

  if (data.length === 0) return <ChartEmpty height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        barCategoryGap={8}
      >
        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
        <XAxis type="number" {...AXIS_PROPS} tickFormatter={formatValue} />
        <YAxis
          type="category"
          dataKey="label"
          {...AXIS_PROPS}
          width={120}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              payload={payload as ChartTooltipItem[] | undefined}
              label={label as string | undefined}
              rows={(items) => {
                const value = Number(items[0]?.value ?? 0);
                return [{ label: valueLabel, value: formatValue(value), color }];
              }}
            />
          )}
        />
        {/* 4px rounded data-end, anchored square to the baseline. */}
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Composition donut. Capped at six slices — beyond that a share chart stops
 * being readable, so the tail folds into "Outros".
 */
export function CompositionChart({
  data,
  height = 260,
  format = "compact",
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: ValueFormat;
}) {
  const formatValue = FORMATTERS[format];

  const slices = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= 6) return sorted;

    const head = sorted.slice(0, 5);
    const tail = sorted.slice(5);
    return [
      ...head,
      {
        label: "Outros",
        value: tail.reduce((sum, item) => sum + item.value, 0),
      },
    ];
  }, [data]);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) return <ChartEmpty height={height} />;

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={2}
            stroke="var(--card)"
          >
            {slices.map((slice, index) => (
              <Cell key={slice.label} fill={seriesColor(index)} />
            ))}
          </Pie>

          <Tooltip
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                payload={payload as ChartTooltipItem[] | undefined}
                rows={(items) => {
                  const item = items[0];
                  if (!item) return [];
                  const value = Number(item.value ?? 0);
                  return [
                    {
                      label: String(item.name ?? ""),
                      value: `${formatValue(value)} · ${formatPercent(percent(value, total), { digits: 0 })}`,
                      color: item.payload?.fill as string | undefined,
                    },
                  ];
                }}
              />
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <ChartLegend
        className="justify-center"
        items={slices.map((slice, index) => ({
          label: slice.label,
          color: seriesColor(index),
        }))}
      />
    </div>
  );
}

/** Funnel drawn as stacked proportional bars — a real funnel shape lies about area. */
export function FunnelChart({
  stages,
}: {
  stages: { label: string; value: number; color: string }[];
}) {
  const top = stages[0]?.value ?? 0;
  if (top === 0) return <ChartEmpty height={220} />;

  return (
    <ol className="space-y-2.5">
      {stages.map((stage, index) => {
        const width = percent(stage.value, top);
        const previous = stages[index - 1]?.value;
        const dropoff =
          previous && previous > 0 ? percent(stage.value, previous) : null;

        return (
          <li key={stage.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: stage.color }}
                />
                {stage.label}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="tabular font-semibold">{stage.value}</span>
                {dropoff !== null ? (
                  <span className="text-muted-foreground text-xs">
                    {formatPercent(dropoff, { digits: 0 })}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.max(width, stage.value > 0 ? 2 : 0)}%`,
                  backgroundColor: stage.color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export { formatCurrencyShort };
