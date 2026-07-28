import { db } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";
import {
  metricsRepository,
  monthPeriod,
  previousPeriod,
} from "@/server/repositories/metrics.repository";
import { leadRepository } from "@/server/repositories/lead.repository";

/**
 * Assembles everything the dashboard renders in one pass.
 *
 * Salespeople see their own numbers; anyone with `lead:view_all` sees the whole
 * floor. Scoping is decided here, once, rather than in each widget.
 */
export async function getDashboardData(user: SessionUser) {
  const org = user.organizationId;
  const seesEverything = hasPermission(user.role, "lead:view_all");
  const scopeId = seesEverything ? undefined : user.id;

  const current = monthPeriod();
  const previous = previousPeriod(current);

  // Twelve-month window for the trend chart.
  const trendFrom = new Date(
    Date.UTC(current.from.getUTCFullYear(), current.from.getUTCMonth() - 11, 1),
  );

  const [
    sales,
    salesPrevious,
    stock,
    leads,
    leadsPrevious,
    monthlySeries,
    dailySeries,
    topSellers,
    goal,
    followUps,
    recentActivity,
    openTasks,
    upcoming,
  ] = await Promise.all([
    metricsRepository.salesSummary(org, current, scopeId),
    metricsRepository.salesSummary(org, previous, scopeId),
    metricsRepository.stockSummary(org),
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
        period: current.from,
        ...(seesEverything
          ? { type: "ORGANIZATION" }
          : { type: "USER", userId: user.id }),
      },
    }),

    leadRepository.dueFollowUps(org, scopeId, 6),

    db.leadActivity.findMany({
      where: { organizationId: org },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { id: true, name: true, image: true } },
        lead: { select: { id: true, name: true } },
      },
    }),

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
    sales,
    salesPrevious,
    stock,
    leads,
    leadsPrevious,
    monthlySeries,
    dailySeries,
    topSellers,
    goal,
    followUps,
    recentActivity,
    openTasks,
    upcoming,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
