"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDelta } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";

type Trend = "up" | "down" | "flat";

function trendOf(delta: number | null): Trend {
  if (delta === null || Math.abs(delta) < 0.05) return "flat";
  return delta > 0 ? "up" : "down";
}

/**
 * The headline KPI tile.
 *
 * `invertTrend` matters: for cost-like metrics (cost per lead, days in stock) a
 * decrease is the good outcome, so the colour must not blindly follow the sign.
 */
function StatCard({
  label,
  value,
  delta = null,
  deltaLabel = "vs. mês anterior",
  icon: Icon,
  accent = "primary",
  invertTrend = false,
  hint,
  footer,
  index = 0,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
  invertTrend?: boolean;
  hint?: string;
  footer?: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const trend = trendOf(delta);
  const isGood =
    trend === "flat" ? null : invertTrend ? trend === "down" : trend === "up";

  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/14 text-warning",
    info: "bg-info/12 text-info",
    destructive: "bg-destructive/12 text-destructive",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        // Stagger by position so a row of tiles cascades instead of popping.
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Card
        interactive
        className={cn("group relative overflow-hidden p-5", className)}
      >
        {/* Subtle wash that lifts on hover — depth without a heavy shadow. */}
        <div
          aria-hidden
          className="from-primary/[0.045] pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Tooltip content={hint}>
              <p className="text-muted-foreground cursor-default text-[13px] font-medium">
                {label}
              </p>
            </Tooltip>

            <p className="tabular truncate text-[26px] leading-none font-semibold tracking-[-0.03em]">
              {value}
            </p>

            {delta !== null ? (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    isGood === null && "bg-muted text-muted-foreground",
                    isGood === true && "bg-success/12 text-success",
                    isGood === false && "bg-destructive/12 text-destructive",
                  )}
                >
                  <TrendIcon className="size-3" strokeWidth={2.5} />
                  {formatDelta(delta)}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {deltaLabel}
                </span>
              </div>
            ) : null}
          </div>

          {Icon ? (
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
                accentClasses,
              )}
            >
              <Icon className="size-4.5" strokeWidth={2} />
            </div>
          ) : null}
        </div>

        {footer ? <div className="relative mt-4">{footer}</div> : null}
      </Card>
    </motion.div>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2.5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-7 w-32 rounded" />
          <div className="skeleton h-4 w-28 rounded" />
        </div>
        <div className="skeleton size-9 shrink-0 rounded-xl" />
      </div>
    </Card>
  );
}

export { StatCard, StatCardSkeleton };
