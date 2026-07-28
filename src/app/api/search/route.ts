import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasPermission, leadVisibilityFilter } from "@/lib/rbac";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export type SearchHit = {
  id: string;
  type: "vehicle" | "lead" | "user" | "appointment";
  title: string;
  subtitle: string | null;
  href: string;
};

/**
 * Backs the ⌘K palette. Results are scoped to the caller's organization and
 * filtered by the same permissions that hide the corresponding nav items, so
 * the palette can never surface a record the user could not otherwise open.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`search:${user.id}`, RATE_LIMITS.mutation);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) return NextResponse.json({ results: [] });

  const org = user.organizationId;
  const contains = { contains: term, mode: "insensitive" } as const;

  const [vehicles, leads, users] = await Promise.all([
    hasPermission(user.role, "vehicle:view")
      ? db.vehicle.findMany({
          where: {
            organizationId: org,
            OR: [
              { brand: contains },
              { model: contains },
              { version: contains },
              { plate: contains },
            ],
          },
          select: {
            id: true,
            brand: true,
            model: true,
            version: true,
            year: true,
            status: true,
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        })
      : [],

    hasPermission(user.role, "lead:view")
      ? db.lead.findMany({
          where: {
            organizationId: org,
            ...leadVisibilityFilter(user.role, user.id),
            OR: [{ name: contains }, { email: contains }, { phone: contains }],
          },
          select: { id: true, name: true, phone: true, stage: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        })
      : [],

    hasPermission(user.role, "user:view")
      ? db.user.findMany({
          where: {
            organizationId: org,
            OR: [{ name: contains }, { email: contains }],
          },
          select: { id: true, name: true, email: true, jobTitle: true },
          take: 4,
        })
      : [],
  ]);

  const results: SearchHit[] = [
    ...vehicles.map((v) => ({
      id: v.id,
      type: "vehicle" as const,
      title: [v.brand, v.model, v.version].filter(Boolean).join(" "),
      subtitle: `${v.year} · ${v.status}`,
      href: `/inventory/${v.id}`,
    })),
    ...leads.map((l) => ({
      id: l.id,
      type: "lead" as const,
      title: l.name,
      subtitle: l.phone,
      href: `/crm/${l.id}`,
    })),
    ...users.map((u) => ({
      id: u.id,
      type: "user" as const,
      title: u.name,
      subtitle: u.jobTitle ?? u.email,
      href: `/users`,
    })),
  ];

  return NextResponse.json({ results });
}
