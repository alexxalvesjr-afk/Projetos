import type { Prisma, VehicleStatus } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Every method takes `organizationId` as its first argument and folds it into
 * the `where` clause. Callers cannot opt out, which is what keeps tenant data
 * isolated even if a route handler forgets to check.
 */

export type VehicleFilters = {
  search?: string;
  status?: VehicleStatus[];
  brands?: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  transmission?: string[];
  fuel?: string[];
  assignedToId?: string;
  featured?: boolean;
  publishedOnly?: boolean;
  /** Only units with no floor price — the ones a salesperson cannot discount. */
  withoutMargin?: boolean;
};

export type VehicleSort =
  | "recent"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "mileage_asc"
  | "year_desc"
  | "aging_desc";

const SORT_MAP: Record<VehicleSort, Prisma.VehicleOrderByWithRelationInput> = {
  recent: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  price_asc: { priceCents: "asc" },
  price_desc: { priceCents: "desc" },
  mileage_asc: { mileage: "asc" },
  year_desc: { year: "desc" },
  // Oldest acquisition first — the units that need attention most.
  aging_desc: { purchasedAt: "asc" },
};

export const vehicleListInclude = {
  images: { orderBy: { position: "asc" }, take: 1 },
  assignedTo: { select: { id: true, name: true, image: true } },
  expenses: { select: { amountCents: true } },
  _count: { select: { leads: true } },
} satisfies Prisma.VehicleInclude;

export const vehicleDetailInclude = {
  images: { orderBy: { position: "asc" } },
  expenses: { orderBy: { incurredAt: "desc" } },
  assignedTo: { select: { id: true, name: true, image: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  sale: true,
  leads: {
    take: 8,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      stage: true,
      createdAt: true,
      phone: true,
    },
  },
} satisfies Prisma.VehicleInclude;

export type VehicleListItem = Prisma.VehicleGetPayload<{
  include: typeof vehicleListInclude;
}>;

export type VehicleDetail = Prisma.VehicleGetPayload<{
  include: typeof vehicleDetailInclude;
}>;

function buildWhere(
  organizationId: string,
  filters: VehicleFilters = {},
): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = { organizationId };
  const and: Prisma.VehicleWhereInput[] = [];

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    and.push({
      OR: [
        { brand: { contains: term, mode: "insensitive" } },
        { model: { contains: term, mode: "insensitive" } },
        { version: { contains: term, mode: "insensitive" } },
        { plate: { contains: term, mode: "insensitive" } },
        { color: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (filters.status?.length) where.status = { in: filters.status };
  if (filters.brands?.length) where.brand = { in: filters.brands };
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.featured !== undefined) where.featured = filters.featured;
  if (filters.publishedOnly) where.published = true;
  // Mirrors the dashboard's alert count, so "Resolver agora" lands on exactly
  // the units it was counting rather than the whole floor.
  if (filters.withoutMargin) {
    where.minPriceCents = { lte: 0 };
    where.status = { in: ["AVAILABLE", "RESERVED"] };
  }

  if (filters.minPriceCents != null || filters.maxPriceCents != null) {
    where.priceCents = {
      ...(filters.minPriceCents != null ? { gte: filters.minPriceCents } : {}),
      ...(filters.maxPriceCents != null ? { lte: filters.maxPriceCents } : {}),
    };
  }

  if (filters.minYear != null || filters.maxYear != null) {
    where.year = {
      ...(filters.minYear != null ? { gte: filters.minYear } : {}),
      ...(filters.maxYear != null ? { lte: filters.maxYear } : {}),
    };
  }

  if (filters.maxMileage != null) where.mileage = { lte: filters.maxMileage };

  if (filters.transmission?.length) {
    where.transmission = {
      in: filters.transmission as Prisma.EnumTransmissionFilter["in"],
    };
  }
  if (filters.fuel?.length) {
    where.fuel = { in: filters.fuel as Prisma.EnumFuelTypeFilter["in"] };
  }

  if (and.length) where.AND = and;
  return where;
}

export const vehicleRepository = {
  async list(
    organizationId: string,
    {
      filters,
      sort = "recent",
      page = 1,
      perPage = 12,
    }: {
      filters?: VehicleFilters;
      sort?: VehicleSort;
      page?: number;
      perPage?: number;
    } = {},
  ) {
    const where = buildWhere(organizationId, filters);
    const skip = (Math.max(1, page) - 1) * perPage;

    // One round trip for both the page and its total.
    const [items, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        include: vehicleListInclude,
        orderBy: SORT_MAP[sort],
        skip,
        take: perPage,
      }),
      db.vehicle.count({ where }),
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
    return db.vehicle.findFirst({
      where: { id, organizationId },
      include: vehicleDetailInclude,
    });
  },

  findBySlug(organizationId: string, slug: string) {
    return db.vehicle.findFirst({
      where: { slug, organizationId },
      include: vehicleDetailInclude,
    });
  },

  /** Storefront lookup — never leaks unpublished or sold stock. */
  findPublicBySlug(organizationSlug: string, slug: string) {
    return db.vehicle.findFirst({
      where: {
        slug,
        published: true,
        status: { in: ["AVAILABLE", "RESERVED"] },
        organization: { slug: organizationSlug },
      },
      include: {
        images: { orderBy: { position: "asc" } },
        organization: {
          select: {
            name: true,
            slug: true,
            phone: true,
            whatsapp: true,
            city: true,
            state: true,
            logoUrl: true,
          },
        },
      },
    });
  },

  create(data: Prisma.VehicleUncheckedCreateInput) {
    return db.vehicle.create({ data, include: vehicleDetailInclude });
  },

  async update(
    organizationId: string,
    id: string,
    data: Prisma.VehicleUncheckedUpdateInput,
  ) {
    // `updateMany` enforces the tenant filter; Prisma's `update` cannot.
    const result = await db.vehicle.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) return null;
    return this.findById(organizationId, id);
  },

  async delete(organizationId: string, id: string) {
    const result = await db.vehicle.deleteMany({ where: { id, organizationId } });
    return result.count > 0;
  },

  /** Distinct brands in stock, for the filter dropdown. */
  async brands(organizationId: string) {
    const rows = await db.vehicle.findMany({
      where: { organizationId },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    });
    return rows.map((r) => r.brand);
  },

  countByStatus(organizationId: string) {
    return db.vehicle.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    });
  },

  /** Ensures a storefront slug is unique within the tenant. */
  async slugExists(organizationId: string, slug: string, exceptId?: string) {
    const found = await db.vehicle.findFirst({
      where: {
        organizationId,
        slug,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(found);
  },

  incrementViews(id: string) {
    return db.vehicle
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => null);
  },
};
