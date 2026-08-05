import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { OPEN_STAGES } from "@/lib/domain/lead";

export type Period = { from: Date; to: Date };

/** Calendar month containing `date`, as a half-open range. */
export function monthPeriod(date = new Date()): Period {
  const from = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const to = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return { from, to };
}

export function previousPeriod({ from, to }: Period): Period {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: from };
}

export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// ---------------------------------------------------------------------------
// Dashboard period selector
// ---------------------------------------------------------------------------

/**
 * Day-level ranges are computed in the dealership's own timezone, not UTC.
 *
 * A showroom in São Paulo runs three hours behind UTC, so a UTC-midnight "today"
 * would roll over at 21:00 local — every evening sale would land on tomorrow and
 * the "Hoje" tile would read zero while the floor was still selling. Month and
 * year are computed the same way for consistency within this selector.
 */
const DEALER_TZ = "America/Sao_Paulo";

/** Milliseconds to add to a UTC instant to get the wall clock in `tz`. */
function tzOffsetMs(at: Date, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  // `hour` comes back as "24" at midnight under hour12:false in some engines.
  const hour = Number(parts.hour) % 24;
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asIfUtc - at.getTime();
}

/** The local wall-clock date in the dealership timezone, as Y/M/D numbers. */
function localParts(at: Date) {
  const shifted = new Date(at.getTime() + tzOffsetMs(at, DEALER_TZ));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/** Converts a local wall-clock midnight to the UTC instant it happens at. */
function localMidnightToUtc(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  return new Date(guess.getTime() - tzOffsetMs(guess, DEALER_TZ));
}

export const PERIOD_KEYS = ["hoje", "ontem", "semana", "mes", "ano"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  semana: "Semana",
  mes: "Mês",
  ano: "Ano",
};

export function isPeriodKey(value: unknown): value is PeriodKey {
  return (
    typeof value === "string" && (PERIOD_KEYS as readonly string[]).includes(value)
  );
}

export function resolvePeriod(key: PeriodKey, now = new Date()): Period {
  const { year, month, day, weekday } = localParts(now);
  const midnight = (y: number, m: number, d: number) => localMidnightToUtc(y, m, d);

  switch (key) {
    case "hoje":
      return { from: midnight(year, month, day), to: midnight(year, month, day + 1) };
    case "ontem":
      return { from: midnight(year, month, day - 1), to: midnight(year, month, day) };
    case "semana": {
      // Monday-first, matching how a dealership talks about "esta semana".
      const back = (weekday + 6) % 7;
      return {
        from: midnight(year, month, day - back),
        to: midnight(year, month, day - back + 7),
      };
    }
    case "ano":
      return { from: midnight(year, 0, 1), to: midnight(year + 1, 0, 1) };
    case "mes":
    default:
      return { from: midnight(year, month, 1), to: midnight(year, month + 1, 1) };
  }
}

/** Human label for the range currently on screen, e.g. "junho de 2026". */
export function periodLabel(key: PeriodKey, now = new Date()): string {
  const { from } = resolvePeriod(key, now);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: DEALER_TZ, ...opts }).format(from);

  switch (key) {
    case "hoje":
    case "ontem":
      return fmt({ day: "2-digit", month: "long" });
    case "semana":
      return `semana de ${fmt({ day: "2-digit", month: "short" })}`;
    case "ano":
      return fmt({ year: "numeric" });
    case "mes":
    default:
      return fmt({ month: "long", year: "numeric" });
  }
}

export type SalesSummary = {
  revenueCents: number;
  costCents: number;
  profitCents: number;
  discountCents: number;
  commissionCents: number;
  unitsSold: number;
  averageTicketCents: number;
  marginPercent: number;
};

function emptySummary(): SalesSummary {
  return {
    revenueCents: 0,
    costCents: 0,
    profitCents: 0,
    discountCents: 0,
    commissionCents: 0,
    unitsSold: 0,
    averageTicketCents: 0,
    marginPercent: 0,
  };
}

export const metricsRepository = {
  /**
   * Headline sales figures for a window. `sellerId` narrows the same query for
   * an individual's dashboard, so managers and salespeople share one code path.
   */
  async salesSummary(
    organizationId: string,
    period: Period,
    sellerId?: string,
  ): Promise<SalesSummary> {
    const result = await db.sale.aggregate({
      where: {
        organizationId,
        soldAt: { gte: period.from, lt: period.to },
        ...(sellerId ? { sellerId } : {}),
      },
      _sum: {
        salePriceCents: true,
        costCents: true,
        discountCents: true,
        commissionCents: true,
      },
      _count: { _all: true },
    });

    const revenueCents = result._sum.salePriceCents ?? 0;
    const costCents = result._sum.costCents ?? 0;
    const unitsSold = result._count._all;
    const profitCents = revenueCents - costCents;

    if (unitsSold === 0) return emptySummary();

    return {
      revenueCents,
      costCents,
      profitCents,
      discountCents: result._sum.discountCents ?? 0,
      commissionCents: result._sum.commissionCents ?? 0,
      unitsSold,
      averageTicketCents: Math.round(revenueCents / unitsSold),
      marginPercent: revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0,
    };
  },

  /** Live stock position, bucketed by status. */
  async stockSummary(organizationId: string) {
    // Not `as const`: a readonly tuple is not assignable to Prisma's mutable
    // `in` filter, and the resulting inference failure silently degrades every
    // aggregate below to `unknown`.
    const onFloor: Prisma.VehicleWhereInput = {
      organizationId,
      status: { in: ["AVAILABLE", "RESERVED"] },
    };

    const [grouped, valuation, priced, withoutMargin] = await Promise.all([
      db.vehicle.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }),
      db.vehicle.aggregate({
        where: onFloor,
        _sum: { priceCents: true, costCents: true },
        _count: { _all: true },
      }),
      // Capital only means something for units whose purchase price is known;
      // a unit entered without a cost would otherwise read as pure profit.
      db.vehicle.aggregate({
        where: { ...onFloor, costCents: { gt: 0 } },
        _sum: { priceCents: true, costCents: true },
        _count: { _all: true },
      }),
      // No floor price set means the salesperson has no discount authority yet.
      db.vehicle.count({ where: { ...onFloor, minPriceCents: { lte: 0 } } }),
    ]);

    const byStatus = Object.fromEntries(
      grouped.map((g) => [g.status, g._count._all]),
    ) as Record<string, number>;

    return {
      byStatus,
      available: byStatus.AVAILABLE ?? 0,
      reserved: byStatus.RESERVED ?? 0,
      pending: byStatus.PENDING ?? 0,
      sold: byStatus.SOLD ?? 0,
      inStock: valuation._count._all,
      /** Capital currently parked in unsold units. */
      investedCents: priced._sum.costCents ?? 0,
      retailValueCents: valuation._sum.priceCents ?? 0,
      /** Units backing `investedCents` — the rest have no cost recorded. */
      pricedCount: priced._count._all,
      /** What the floor is worth if every priced unit sells at its ask. */
      expectedProfitCents:
        (priced._sum.priceCents ?? 0) - (priced._sum.costCents ?? 0),
      /** Units the salesperson cannot discount because no floor price exists. */
      withoutMarginCount: withoutMargin,
    };
  },

  async leadSummary(
    organizationId: string,
    period: Period,
    assignedToId?: string,
  ) {
    const scope = { organizationId, ...(assignedToId ? { assignedToId } : {}) };

    const [created, won, openCount, byStage] = await Promise.all([
      db.lead.count({
        where: { ...scope, createdAt: { gte: period.from, lt: period.to } },
      }),
      db.lead.count({
        where: {
          ...scope,
          stage: "WON",
          wonAt: { gte: period.from, lt: period.to },
        },
      }),
      db.lead.count({ where: { ...scope, stage: { in: OPEN_STAGES } } }),
      db.lead.groupBy({
        by: ["stage"],
        where: scope,
        _count: { _all: true },
      }),
    ]);

    return {
      created,
      won,
      open: openCount,
      // Conversion is measured against leads created in the window so the
      // denominator matches the numerator's cohort.
      conversionRate: created > 0 ? (won / created) * 100 : 0,
      byStage: Object.fromEntries(
        byStage.map((g) => [g.stage, g._count._all]),
      ) as Record<string, number>,
    };
  },

  /**
   * Revenue/profit/units per day or month. Uses `date_trunc` in SQL so the
   * database does the bucketing rather than shipping every row to Node.
   */
  async salesTimeSeries(
    organizationId: string,
    period: Period,
    granularity: "day" | "month" = "day",
  ) {
    const rows = await db.$queryRaw<
      { bucket: Date; revenue: bigint; cost: bigint; units: bigint }[]
    >(Prisma.sql`
      SELECT
        date_trunc(${granularity}, "soldAt") AS bucket,
        COALESCE(SUM("salePriceCents"), 0)  AS revenue,
        COALESCE(SUM("costCents"), 0)       AS cost,
        COUNT(*)                            AS units
      FROM "Sale"
      WHERE "organizationId" = ${organizationId}
        AND "soldAt" >= ${period.from}
        AND "soldAt" <  ${period.to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    return rows.map((r) => ({
      date: r.bucket,
      revenueCents: Number(r.revenue),
      costCents: Number(r.cost),
      profitCents: Number(r.revenue) - Number(r.cost),
      units: Number(r.units),
    }));
  },

  /** Leads created per bucket — plotted against sales to show funnel health. */
  async leadsTimeSeries(
    organizationId: string,
    period: Period,
    granularity: "day" | "month" = "day",
  ) {
    const rows = await db.$queryRaw<{ bucket: Date; total: bigint }[]>(
      Prisma.sql`
        SELECT date_trunc(${granularity}, "createdAt") AS bucket, COUNT(*) AS total
        FROM "Lead"
        WHERE "organizationId" = ${organizationId}
          AND "createdAt" >= ${period.from}
          AND "createdAt" <  ${period.to}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    );
    return rows.map((r) => ({ date: r.bucket, leads: Number(r.total) }));
  },

  /** Leaderboard for the sales ranking and dashboard "top sellers" panel. */
  async topSellers(organizationId: string, period: Period, limit = 5) {
    const grouped = await db.sale.groupBy({
      by: ["sellerId"],
      where: {
        organizationId,
        soldAt: { gte: period.from, lt: period.to },
        sellerId: { not: null },
      },
      _sum: { salePriceCents: true, costCents: true, commissionCents: true },
      _count: { _all: true },
      orderBy: { _sum: { salePriceCents: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const sellers = await db.user.findMany({
      where: { id: { in: grouped.map((g) => g.sellerId!) } },
      select: { id: true, name: true, image: true, jobTitle: true },
    });
    const byId = new Map(sellers.map((s) => [s.id, s]));

    return grouped.map((g) => {
      const revenueCents = g._sum.salePriceCents ?? 0;
      const costCents = g._sum.costCents ?? 0;
      const seller = byId.get(g.sellerId!);
      return {
        sellerId: g.sellerId!,
        name: seller?.name ?? "Removido",
        image: seller?.image ?? null,
        jobTitle: seller?.jobTitle ?? null,
        unitsSold: g._count._all,
        revenueCents,
        profitCents: revenueCents - costCents,
        commissionCents: g._sum.commissionCents ?? 0,
      };
    });
  },

  /** Best-performing models by units and margin. */
  async topVehicles(organizationId: string, period: Period, limit = 6) {
    const rows = await db.$queryRaw<
      { brand: string; model: string; units: bigint; revenue: bigint; profit: bigint }[]
    >(Prisma.sql`
      SELECT v."brand",
             v."model",
             COUNT(*)                                          AS units,
             COALESCE(SUM(s."salePriceCents"), 0)              AS revenue,
             COALESCE(SUM(s."salePriceCents" - s."costCents"), 0) AS profit
      FROM "Sale" s
      JOIN "Vehicle" v ON v."id" = s."vehicleId"
      WHERE s."organizationId" = ${organizationId}
        AND s."soldAt" >= ${period.from}
        AND s."soldAt" <  ${period.to}
      GROUP BY v."brand", v."model"
      ORDER BY units DESC, revenue DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      brand: r.brand,
      model: r.model,
      units: Number(r.units),
      revenueCents: Number(r.revenue),
      profitCents: Number(r.profit),
    }));
  },

  /** Where leads come from — feeds the acquisition report. */
  async leadsBySource(organizationId: string, period: Period) {
    const grouped = await db.lead.groupBy({
      by: ["source"],
      where: {
        organizationId,
        createdAt: { gte: period.from, lt: period.to },
      },
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
    });

    return grouped.map((g) => ({
      source: g.source,
      count: g._count._all,
    }));
  },

  /** Capital-at-risk view: how long each unit has been sitting. */
  async stockAging(organizationId: string) {
    const rows = await db.$queryRaw<
      { band: string; units: bigint; invested: bigint }[]
    >(Prisma.sql`
      SELECT
        CASE
          WHEN NOW() - "purchasedAt" <= INTERVAL '30 days' THEN 'fresh'
          WHEN NOW() - "purchasedAt" <= INTERVAL '60 days' THEN 'healthy'
          WHEN NOW() - "purchasedAt" <= INTERVAL '90 days' THEN 'watch'
          ELSE 'stale'
        END                              AS band,
        COUNT(*)                         AS units,
        COALESCE(SUM("costCents"), 0)    AS invested
      FROM "Vehicle"
      WHERE "organizationId" = ${organizationId}
        AND "status" IN ('AVAILABLE', 'RESERVED', 'PENDING')
      GROUP BY band
    `);

    return rows.map((r) => ({
      band: r.band,
      units: Number(r.units),
      investedCents: Number(r.invested),
    }));
  },

  /** Marketing spend aggregated across campaigns for ROI/ROAS. */
  async marketingSummary(organizationId: string, period: Period) {
    const rows = await db.$queryRaw<
      {
        spend: bigint;
        impressions: bigint;
        clicks: bigint;
        leads: bigint;
        sales: bigint;
        revenue: bigint;
      }[]
    >(Prisma.sql`
      SELECT
        COALESCE(SUM(m."spendCents"), 0)   AS spend,
        COALESCE(SUM(m."impressions"), 0)  AS impressions,
        COALESCE(SUM(m."clicks"), 0)       AS clicks,
        COALESCE(SUM(m."leads"), 0)        AS leads,
        COALESCE(SUM(m."sales"), 0)        AS sales,
        COALESCE(SUM(m."revenueCents"), 0) AS revenue
      FROM "CampaignMetric" m
      JOIN "Campaign" c ON c."id" = m."campaignId"
      WHERE c."organizationId" = ${organizationId}
        AND m."date" >= ${period.from}
        AND m."date" <  ${period.to}
    `);

    const r = rows[0];
    const spendCents = Number(r?.spend ?? 0);
    const revenueCents = Number(r?.revenue ?? 0);
    const leads = Number(r?.leads ?? 0);
    const sales = Number(r?.sales ?? 0);
    const clicks = Number(r?.clicks ?? 0);
    const impressions = Number(r?.impressions ?? 0);

    return {
      spendCents,
      revenueCents,
      leads,
      sales,
      clicks,
      impressions,
      costPerLeadCents: leads > 0 ? Math.round(spendCents / leads) : 0,
      costPerSaleCents: sales > 0 ? Math.round(spendCents / sales) : 0,
      // ROAS is a ratio (4.2×); ROI is a percentage return on the spend.
      roas: spendCents > 0 ? revenueCents / spendCents : 0,
      roiPercent:
        spendCents > 0 ? ((revenueCents - spendCents) / spendCents) * 100 : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversionRate: clicks > 0 ? (leads / clicks) * 100 : 0,
    };
  },
};
