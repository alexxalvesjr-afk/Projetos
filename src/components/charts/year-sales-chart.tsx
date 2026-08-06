"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { ChartEmpty } from "@/components/charts/chart-primitives";

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export type MonthlyUnits = { date: Date | string; units: number };

/**
 * Units sold per month across the calendar year.
 *
 * One series, so no legend box — the card title names it, and a legend for a
 * single colour is furniture. There is no y-axis either: the question this
 * answers is "which months moved cars", which the bar heights and the hover
 * value already answer, and a tick column would be four more things to read
 * for no extra information.
 *
 * The diagonal hatch is not decoration. It is the texture channel from the
 * chart system, and it keeps the bars distinguishable from the surface in
 * forced-colours mode and in print, where the green fill alone can drop out.
 */
export function YearSalesChart({
  data,
  height = 260,
}: {
  data: MonthlyUnits[];
  height?: number;
}) {
  // The query only returns months that had a sale; the axis always shows all
  // twelve, so absent months have to be filled in rather than skipped.
  const series = React.useMemo(() => {
    const byMonth = new Map<number, number>();
    for (const point of data) {
      const date = typeof point.date === "string" ? new Date(point.date) : point.date;
      byMonth.set(date.getUTCMonth(), point.units);
    }
    return MONTHS.map((label, index) => ({
      label,
      units: byMonth.get(index) ?? 0,
      isCurrent: index === new Date().getMonth(),
    }));
  }, [data]);

  const total = series.reduce((sum, month) => sum + month.units, 0);
  if (total === 0) return <ChartEmpty height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <pattern
            id="year-sales-hatch"
            patternUnits="userSpaceOnUse"
            width="7"
            height="7"
            patternTransform="rotate(45)"
          >
            <rect width="7" height="7" fill="var(--chart-5)" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="7"
              stroke="var(--card)"
              strokeWidth="2.5"
              opacity="0.35"
            />
          </pattern>
        </defs>

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={({ x, y, payload, index }) => (
            <text
              x={x}
              y={y + 14}
              textAnchor="middle"
              className={
                series[index]?.isCurrent
                  ? "fill-foreground text-xs font-semibold"
                  : "fill-muted-foreground text-xs"
              }
            >
              {payload.value}
            </text>
          )}
        />

        <Tooltip
          cursor={false}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const units = Number(payload[0]?.value ?? 0);
            return (
              <div className="bg-popover rounded-lg border px-3 py-2 shadow-md">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span
                    aria-hidden
                    className="bg-chart-5 size-2 rounded-full"
                  />
                  Vendas · {label}
                </p>
                <p className="tabular text-base font-semibold">{units}</p>
              </div>
            );
          }}
        />

        {/* Fully rounded data-end, anchored square to the baseline. */}
        <Bar dataKey="units" radius={[999, 999, 4, 4]} maxBarSize={44}>
          {series.map((month) => (
            <Cell
              key={month.label}
              fill="url(#year-sales-hatch)"
              // A month with no sales gets no bar at all rather than a stub:
              // a 2px sliver reads as "almost one sale", which is a lie.
              fillOpacity={month.units > 0 ? 1 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
