"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatCurrencyShort, formatDate } from "@/lib/format";
import {
  AXIS_PROPS,
  ChartEmpty,
  ChartLegend,
  ChartTooltip,
  GRID_PROPS,
  type ChartTooltipItem,
} from "@/components/charts/chart-primitives";

export type RevenuePoint = {
  date: Date | string;
  revenueCents: number;
  profitCents: number;
  units: number;
};

/**
 * Revenue and profit over time.
 *
 * Both series share one axis — revenue and profit are the same unit, so a
 * second scale would misrepresent the gap between them. Units are shown in the
 * tooltip rather than as a third series, since counts and money do not belong
 * on a common axis.
 */
export function RevenueChart({
  data,
  granularity = "day",
  height = 300,
}: {
  data: RevenuePoint[];
  granularity?: "day" | "month";
  height?: number;
}) {
  const points = React.useMemo(
    () =>
      data.map((point) => ({
        ...point,
        label:
          granularity === "month"
            ? new Intl.DateTimeFormat("pt-BR", {
                month: "short",
                year: "2-digit",
              }).format(new Date(point.date))
            : formatDate(point.date, "short"),
        revenue: point.revenueCents / 100,
        profit: point.profitCents / 100,
      })),
    [data, granularity],
  );

  if (points.length === 0) return <ChartEmpty height={height} />;

  const legend = [
    { label: "Faturamento", color: "var(--chart-1)" },
    { label: "Lucro", color: "var(--chart-5)" },
  ];

  return (
    <div className="space-y-3">
      <ChartLegend items={legend} />

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={points}
          margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profit-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid {...GRID_PROPS} />

          <XAxis
            dataKey="label"
            {...AXIS_PROPS}
            minTickGap={24}
            padding={{ left: 4, right: 4 }}
          />
          <YAxis
            {...AXIS_PROPS}
            width={64}
            tickFormatter={(value: number) =>
              formatCurrencyShort(value * 100).replace(/\s/g, " ")
            }
          />

          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as ChartTooltipItem[] | undefined}
                label={label as string | undefined}
                rows={(payload) => {
                  const point = payload[0]?.payload as
                    | (typeof points)[number]
                    | undefined;
                  if (!point) return [];
                  return [
                    {
                      label: "Faturamento",
                      value: formatCurrency(point.revenueCents),
                      color: "var(--chart-1)",
                    },
                    {
                      label: "Lucro",
                      value: formatCurrency(point.profitCents),
                      color: "var(--chart-5)",
                    },
                    {
                      label: point.units === 1 ? "Veículo" : "Veículos",
                      value: String(point.units),
                    },
                  ];
                }}
              />
            )}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#revenue-fill)"
            // 2px surface ring keeps overlapping marks legible.
            activeDot={{
              r: 4,
              strokeWidth: 2,
              stroke: "var(--card)",
              fill: "var(--chart-1)",
            }}
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="var(--chart-5)"
            strokeWidth={2}
            fill="url(#profit-fill)"
            activeDot={{
              r: 4,
              strokeWidth: 2,
              stroke: "var(--card)",
              fill: "var(--chart-5)",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
