import type { LeadStage, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export const leadCardSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  stage: true,
  source: true,
  temperature: true,
  score: true,
  position: true,
  budgetCents: true,
  lastContactAt: true,
  nextFollowUpAt: true,
  createdAt: true,
  assignedTo: { select: { id: true, name: true, image: true } },
  interestVehicle: {
    select: {
      id: true,
      brand: true,
      model: true,
      version: true,
      year: true,
      priceCents: true,
      slug: true,
    },
  },
  _count: { select: { tasks: true, activities: true } },
} satisfies Prisma.LeadSelect;

export type LeadCard = Prisma.LeadGetPayload<{ select: typeof leadCardSelect }>;

export const leadDetailInclude = {
  assignedTo: { select: { id: true, name: true, image: true, email: true } },
  interestVehicle: {
    include: { images: { take: 1, orderBy: { position: "asc" } } },
  },
  campaign: { select: { id: true, name: true, channel: true } },
  activities: {
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  tasks: {
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
    include: { assignedTo: { select: { id: true, name: true, image: true } } },
  },
  appointments: {
    orderBy: { startsAt: "desc" },
    include: { assignedTo: { select: { id: true, name: true } } },
  },
  sale: true,
} satisfies Prisma.LeadInclude;

export type LeadDetail = Prisma.LeadGetPayload<{
  include: typeof leadDetailInclude;
}>;

export type LeadFilters = {
  search?: string;
  stages?: LeadStage[];
  assignedToId?: string;
  source?: string[];
  temperature?: string[];
  /** Only leads with no contact in the last 7 days. */
  staleOnly?: boolean;
};

function buildWhere(
  organizationId: string,
  filters: LeadFilters = {},
  visibility?: { assignedToId: string },
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { organizationId, ...visibility };

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  if (filters.stages?.length) where.stage = { in: filters.stages };
  // An explicit filter may narrow the visibility scope but never widen it.
  if (filters.assignedToId && !visibility) {
    where.assignedToId = filters.assignedToId;
  }
  if (filters.source?.length) {
    where.source = { in: filters.source as Prisma.EnumLeadSourceFilter["in"] };
  }
  if (filters.temperature?.length) {
    where.temperature = {
      in: filters.temperature as Prisma.EnumLeadTemperatureFilter["in"],
    };
  }

  if (filters.staleOnly) {
    const cutoff = new Date(Date.now() - 7 * 86_400_000);
    where.AND = [
      { stage: { notIn: ["WON", "LOST"] } },
      {
        OR: [
          { lastContactAt: { lt: cutoff } },
          { lastContactAt: null, createdAt: { lt: cutoff } },
        ],
      },
    ];
  }

  return where;
}

export const leadRepository = {
  /**
   * Loads the full board in one query and groups in memory. Pipelines are
   * bounded (a busy floor runs a few hundred open leads), so this is far
   * cheaper than seven round trips.
   */
  async board(
    organizationId: string,
    filters?: LeadFilters,
    visibility?: { assignedToId: string },
  ) {
    const leads = await db.lead.findMany({
      where: buildWhere(organizationId, filters, visibility),
      select: leadCardSelect,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      // Terminal columns are capped so a year of closed deals cannot
      // overwhelm the board.
      take: 500,
    });

    const columns = new Map<LeadStage, LeadCard[]>();
    for (const lead of leads) {
      const bucket = columns.get(lead.stage) ?? [];
      bucket.push(lead);
      columns.set(lead.stage, bucket);
    }
    return columns;
  },

  async list(
    organizationId: string,
    {
      filters,
      visibility,
      page = 1,
      perPage = 20,
    }: {
      filters?: LeadFilters;
      visibility?: { assignedToId: string };
      page?: number;
      perPage?: number;
    } = {},
  ) {
    const where = buildWhere(organizationId, filters, visibility);
    const [items, total] = await Promise.all([
      db.lead.findMany({
        where,
        select: leadCardSelect,
        orderBy: { createdAt: "desc" },
        skip: (Math.max(1, page) - 1) * perPage,
        take: perPage,
      }),
      db.lead.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(total / perPage)),
    };
  },

  findById(organizationId: string, id: string) {
    return db.lead.findFirst({
      where: { id, organizationId },
      include: leadDetailInclude,
    });
  },

  create(data: Prisma.LeadUncheckedCreateInput) {
    return db.lead.create({ data, select: leadCardSelect });
  },

  async update(
    organizationId: string,
    id: string,
    data: Prisma.LeadUncheckedUpdateInput,
  ) {
    const result = await db.lead.updateMany({
      where: { id, organizationId },
      data,
    });
    return result.count > 0;
  },

  async delete(organizationId: string, id: string) {
    const result = await db.lead.deleteMany({ where: { id, organizationId } });
    return result.count > 0;
  },

  /** Next ordering slot at the top of a column. */
  async nextPosition(organizationId: string, stage: LeadStage) {
    const first = await db.lead.findFirst({
      where: { organizationId, stage },
      orderBy: { position: "asc" },
      select: { position: true },
    });
    return (first?.position ?? 0) - 1;
  },

  addActivity(data: Prisma.LeadActivityUncheckedCreateInput) {
    return db.leadActivity.create({ data });
  },

  /** Follow-ups due today or overdue — drives the dashboard reminder list. */
  dueFollowUps(organizationId: string, userId?: string, limit = 8) {
    return db.lead.findMany({
      where: {
        organizationId,
        stage: { notIn: ["WON", "LOST"] },
        nextFollowUpAt: { lte: new Date() },
        ...(userId ? { assignedToId: userId } : {}),
      },
      select: leadCardSelect,
      orderBy: { nextFollowUpAt: "asc" },
      take: limit,
    });
  },
};
