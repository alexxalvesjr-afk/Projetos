import { db } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";
import {
  metricsRepository,
  monthPeriod,
  previousPeriod,
  resolvePeriod,
  type PeriodKey,
} from "@/server/repositories/metrics.repository";
import { leadRepository } from "@/server/repositories/lead.repository";

/**
 * Assembles everything the dashboard renders in one pass.
 *
 * Salespeople see their own numbers; anyone with `lead:view_all` sees the whole
 * floor. Scoping is decided here, once, rather than in each widget.
 */
export async function getDashboardData(
  user: SessionUser,
  periodKey: PeriodKey = "mes",
) {
  const org = user.organizationId;
  const seesEverything = hasPermission(user.role, "lead:view_all");
  const scopeId = seesEverything ? undefined : user.id;

  // The three headline numbers follow this window; everything under "Sua loja
  // agora" is a point-in-time snapshot and deliberately ignores it.
  const current = resolvePeriod(periodKey);
  const previous = previousPeriod(current);

  // Targets are always monthly. Reading them through the selected window would
  // make the goal banner vanish the moment someone clicked "Hoje", because no
  // Goal row is stored against a single day.
  const month = monthPeriod();

  // Twelve-month window for the trend chart.
  const trendFrom = new Date(
    Date.UTC(current.from.getUTCFullYear(), current.from.getUTCMonth() - 11, 1),
  );

  const [
    sales,
    salesPrevious,
    monthSales,
    stock,
    turnover,
    leads,
    leadsPrevious,
    monthlySeries,
    dailySeries,
    topSellers,
    goal,
    followUps,
    openTasks,
    upcoming,
  ] = await Promise.all([
    metricsRepository.salesSummary(org, current, scopeId),
    metricsRepository.salesSummary(org, previous, scopeId),
    metricsRepository.salesSummary(org, month, scopeId),
    metricsRepository.stockSummary(org),
    metricsRepository.stockTurnover(org, 6),
    metricsRepository.leadSummary(org, current, scopeId),
    metricsRepository.leadSummary(org, previous, scopeId),
    metricsRepository.salesTimeSeries(
      org,
      { from: trendFrom, to: current.to },
      "month",
    ),
    metricsRepository.salesTimeSeries(org, current, "day"),
    metricsRepository.topSellers(org, current, 5),

    // The org goal for managers, the personal goal for a salesperson.
    db.goal.findFirst({
      where: {
        organizationId: org,
        period: month.from,
        ...(seesEverything
          ? { type: "ORGANIZATION" }
          : { type: "USER", userId: user.id }),
      },
    }),

    leadRepository.dueFollowUps(org, scopeId, 6),


    db.task.count({
      where: {
        organizationId: org,
        completedAt: null,
        ...(scopeId ? { assignedToId: scopeId } : {}),
      },
    }),

    db.appointment.findMany({
      where: {
        organizationId: org,
        startsAt: { gte: new Date() },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        ...(scopeId ? { assignedToId: scopeId } : {}),
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: {
        lead: { select: { id: true, name: true } },
        vehicle: { select: { id: true, brand: true, model: true } },
      },
    }),
  ]);

  return {
    scope: seesEverything ? ("organization" as const) : ("personal" as const),
    period: current,
    periodKey,
    sales,
    salesPrevious,
    monthSales,
    stock,
    turnover,
    leads,
    leadsPrevious,
    monthlySeries,
    dailySeries,
    topSellers,
    goal,
    followUps,
    openTasks,
    upcoming,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
