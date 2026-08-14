import type { Metadata } from "next";
import { Suspense } from "react";
import { Award, Medal, Target, Trophy } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { cn, clamp, percent } from "@/lib/utils";
import { formatCurrencyShort, formatPercent } from "@/lib/format";
import {
  metricsRepository,
  monthPeriod,
} from "@/server/repositories/metrics.repository";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import { GoalEditor } from "@/components/goals/goal-editor";

export const metadata: Metadata = {
  title: "Metas",
  description: "Metas da loja, ranking de vendedores e conquistas.",
};

export const dynamic = "force-dynamic";

const TIER_STYLES: Record<string, string> = {
  gold: "bg-[oklch(0.85_0.13_85)]/18 text-[oklch(0.58_0.14_85)]",
  silver: "bg-muted text-muted-foreground",
  bronze: "bg-[oklch(0.72_0.11_45)]/18 text-[oklch(0.52_0.12_45)]",
};

async function Goals() {
  const user = await requirePermission("goal:view");
  const canManage = hasPermission(user.role, "goal:manage");
  const period = monthPeriod();

  const [orgGoal, userGoals, orgSales, ranking, team, achievements] =
    await Promise.all([
      db.goal.findFirst({
        where: {
          organizationId: user.organizationId,
          type: "ORGANIZATION",
          period: period.from,
        },
      }),
      db.goal.findMany({
        where: {
          organizationId: user.organizationId,
          type: "USER",
          period: period.from,
        },
      }),
      metricsRepository.salesSummary(user.organizationId, period),
      metricsRepository.topSellers(user.organizationId, period, 20),
      db.user.findMany({
        where: {
          organizationId: user.organizationId,
          isActive: true,
          role: { in: ["MANAGER", "SALESPERSON"] },
        },
        select: { id: true, name: true, image: true, jobTitle: true },
        orderBy: { name: "asc" },
      }),
      db.achievement.findMany({
        where: { user: { organizationId: user.organizationId } },
        orderBy: { earnedAt: "desc" },
        take: 12,
        include: { user: { select: { id: true, name: true, image: true } } },
      }),
    ]);

  const goalByUser = new Map(userGoals.map((goal) => [goal.userId, goal]));
  const salesByUser = new Map(ranking.map((row) => [row.sellerId, row]));

  // Everyone on the floor appears, including those who have not sold yet —
  // a ranking that hides the bottom is not a ranking.
  const rows = team
    .map((member) => {
      const sales = salesByUser.get(member.id);
      const goal = goalByUser.get(member.id);
      const revenueCents = sales?.revenueCents ?? 0;
      const target = goal?.targetRevenueCents ?? 0;

      return {
        ...member,
        unitsSold: sales?.unitsSold ?? 0,
        revenueCents,
        profitCents: sales?.profitCents ?? 0,
        targetRevenueCents: target,
        targetUnits: goal?.targetUnits ?? 0,
        attainment: target > 0 ? percent(revenueCents, target) : null,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const orgAttainment = orgGoal
    ? percent(orgSales.revenueCents, orgGoal.targetRevenueCents)
    : null;

  return (
    <div className="space-y-6">
      {/* Organization goal */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Meta da loja</CardTitle>
            <CardDescription>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(period.from)}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!orgGoal ? (
              <EmptyState
                compact
                icon={Target}
                title="Nenhuma meta definida"
                description={
                  canManage
                    ? "Defina a meta do mês para acompanhar o ritmo da equipe."
                    : "Peça ao gestor para definir a meta deste mês."
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  {
                    label: "Faturamento",
                    current: orgSales.revenueCents,
                    target: orgGoal.targetRevenueCents,
                    format: formatCurrencyShort,
                  },
                  {
                    label: "Lucro",
                    current: orgSales.profitCents,
                    target: orgGoal.targetProfitCents,
                    format: formatCurrencyShort,
                  },
                  {
                    label: "Veículos",
                    current: orgSales.unitsSold,
                    target: orgGoal.targetUnits,
                    format: (value: number) => String(value),
                  },
                ].map((line) => {
                  const value = clamp(percent(line.current, line.target), 0, 100);
                  return (
                    <div key={line.label} className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        {line.label}
                      </p>
                      <p className="tabular text-xl font-semibold">
                        {line.format(line.current)}
                      </p>
                      <Progress
                        value={value}
                        indicatorClassName={value >= 100 ? "bg-success" : undefined}
                      />
                      <p className="text-muted-foreground text-xs">
                        {formatPercent(value, { digits: 0 })} de{" "}
                        {line.format(line.target)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atingimento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-6">
            {/* Radial gauge drawn with a conic gradient — no chart library. */}
            <div
              className="relative flex size-36 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(var(--primary) ${clamp(orgAttainment ?? 0, 0, 100) * 3.6}deg, var(--muted) 0deg)`,
              }}
            >
              <div className="bg-card flex size-28 flex-col items-center justify-center rounded-full">
                <span className="tabular text-2xl font-semibold tracking-[-0.03em]">
                  {orgAttainment === null
                    ? "—"
                    : formatPercent(orgAttainment, { digits: 0 })}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  da meta
                </span>
              </div>
            </div>

            {canManage ? <GoalEditor team={team} period={period.from} /> : null}
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de vendedores</CardTitle>
          <CardDescription>
            Ordenado por faturamento no mês corrente.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              compact
              icon={Trophy}
              title="Nenhum vendedor cadastrado"
              description="Convide sua equipe para acompanhar o desempenho individual."
            />
          ) : (
            <ol className="space-y-3">
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                      index === 0
                        ? TIER_STYLES.gold
                        : index === 1
                          ? TIER_STYLES.silver
                          : index === 2
                            ? TIER_STYLES.bronze
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index === 0 ? <Trophy className="size-4" /> : index + 1}
                  </span>

                  <UserAvatar
                    name={row.name}
                    image={row.image}
                    className="size-9 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.unitsSold}{" "}
                      {row.unitsSold === 1 ? "venda" : "vendas"} ·{" "}
                      {formatCurrencyShort(row.profitCents)} de lucro
                    </p>
                  </div>

                  <div className="w-full sm:w-56">
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      <span className="tabular font-semibold">
                        {formatCurrencyShort(row.revenueCents)}
                      </span>
                      {row.attainment !== null ? (
                        <span
                          className={cn(
                            "font-medium",
                            row.attainment >= 100
                              ? "text-success"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatPercent(row.attainment, { digits: 0 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sem meta</span>
                      )}
                    </div>
                    <Progress
                      value={clamp(row.attainment ?? 0, 0, 100)}
                      indicatorClassName={
                        (row.attainment ?? 0) >= 100 ? "bg-success" : undefined
                      }
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Conquistas recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <EmptyState
              compact
              icon={Award}
              title="Nenhuma conquista ainda"
              description="Conquistas aparecem conforme a equipe bate marcos de vendas."
            />
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <li
                  key={achievement.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      TIER_STYLES[achievement.tier] ?? TIER_STYLES.bronze,
                    )}
                  >
                    <Medal className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {achievement.label}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {achievement.user.name}
                    </p>
                  </div>
                  <Badge variant="outline" size="sm" className="ml-auto shrink-0">
                    {achievement.tier}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function GoalsPage() {
  await requirePermission("goal:view");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas e ranking"
      />

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        }
      >
        <Goals />
      </Suspense>
    </div>
  );
}
