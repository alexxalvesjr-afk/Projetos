"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Target, TrendingUp } from "lucide-react";

import { cn, clamp, percent } from "@/lib/utils";
import { formatCurrency, formatCurrencyShort, formatPercent } from "@/lib/format";
import { goalPace, paceSentence } from "@/lib/domain/goal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

type GoalLine = {
  label: string;
  current: number;
  target: number;
  format: (value: number) => string;
};

/**
 * Monthly target tracker with a pace indicator: hitting 60% of the goal on day
 * 20 of a 30-day month is behind, not ahead, and the bar says so.
 */
export function GoalProgressCard({
  goal,
  revenueCents,
  profitCents,
  units,
  scope,
  canManage,
}: {
  goal: {
    targetRevenueCents: number;
    targetProfitCents: number;
    targetUnits: number;
  } | null;
  revenueCents: number;
  profitCents: number;
  units: number;
  scope: "organization" | "personal";
  canManage: boolean;
}) {
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const dayOfMonth = now.getDate();
  const expectedPace = (dayOfMonth / daysInMonth) * 100;

  if (!goal) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Meta do mês</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center">
          <EmptyState
            compact
            icon={Target}
            title="Nenhuma meta definida"
            description={
              canManage
                ? "Defina a meta do mês para acompanhar o ritmo da equipe."
                : "Peça ao gestor para definir a meta deste mês."
            }
            action={
              canManage ? (
                <Button asChild size="sm">
                  <Link href="/goals">Definir meta</Link>
                </Button>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  const lines: GoalLine[] = [
    {
      label: "Faturamento",
      current: revenueCents,
      target: goal.targetRevenueCents,
      format: (v) => formatCurrencyShort(v),
    },
    {
      label: "Lucro",
      current: profitCents,
      target: goal.targetProfitCents,
      format: (v) => formatCurrencyShort(v),
    },
    {
      label: "Veículos",
      current: units,
      target: goal.targetUnits,
      format: (v) => String(v),
    },
  ];

  const headline = percent(revenueCents, goal.targetRevenueCents);
  const onPace = headline >= expectedPace;

  // Paced on units rather than revenue: "3 sales short" is something a floor
  // can act on this afternoon; "R$ 180 mil short" is not.
  const pace = goalPace(units, goal.targetUnits);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          {scope === "organization" ? "Meta da loja" : "Minha meta"}
        </CardTitle>
        <CardDescription>
          {units} de {goal.targetUnits} veículos · dia {dayOfMonth} de{" "}
          {daysInMonth}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        {/* Headline */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="tabular text-[32px] leading-none font-semibold tracking-[-0.03em]">
              {formatPercent(headline, { digits: 0 })}
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {formatCurrency(revenueCents)} de{" "}
              {formatCurrencyShort(goal.targetRevenueCents)}
            </p>
          </div>

          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
              onPace
                ? "bg-success/12 text-success"
                : "bg-warning/14 text-warning",
            )}
          >
            <TrendingUp className="size-3.5" />
            {onPace ? "No ritmo" : "Abaixo do ritmo"}
          </span>
        </div>

        {/* The percentage above says where the month stands; this says where it
            ends up, which is the part that changes what the floor does today. */}
        {pace ? (
          <p
            className={cn(
              "rounded-lg px-3 py-2.5 text-[13px] leading-relaxed",
              pace.onTrack
                ? "bg-success/10 text-success"
                : "bg-warning/12 text-warning",
            )}
          >
            {paceSentence(pace, "veículos")}
          </p>
        ) : null}

        {/* Bars */}
        <div className="space-y-4">
          {lines.map((line, index) => {
            const value = clamp(percent(line.current, line.target), 0, 100);

            return (
              <div key={line.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="tabular font-medium">
                    {line.format(line.current)}
                    <span className="text-muted-foreground font-normal">
                      {" / "}
                      {line.format(line.target)}
                    </span>
                  </span>
                </div>

                <div className="bg-muted relative h-2 overflow-hidden rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{
                      duration: 0.9,
                      delay: 0.1 + index * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={cn(
                      "h-full rounded-full",
                      value >= 100 ? "bg-success" : "bg-primary",
                    )}
                  />
                  {/* Pace marker — where the bar should be today. */}
                  <span
                    aria-hidden
                    className="bg-foreground/45 absolute inset-y-0 w-px"
                    style={{ left: `${clamp(expectedPace, 0, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
