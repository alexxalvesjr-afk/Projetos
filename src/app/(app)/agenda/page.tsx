import type { Metadata } from "next";
import { Suspense } from "react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { vehicleTitle } from "@/lib/domain/vehicle";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AgendaClient } from "@/components/agenda/agenda-client";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Visitas, test drives e entregas da sua equipe.",
};

export const dynamic = "force-dynamic";

async function Agenda() {
  const user = await requirePermission("appointment:view");

  // Salespeople see only their own commitments unless they manage the floor.
  const canSeeAll = hasPermission(user.role, "lead:view_all");

  // Window generously around today so month navigation rarely refetches.
  const from = new Date();
  from.setMonth(from.getMonth() - 2);
  const to = new Date();
  to.setMonth(to.getMonth() + 4);

  const [appointments, leads, vehicles, sellers] = await Promise.all([
    db.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        startsAt: { gte: from, lte: to },
        ...(canSeeAll ? {} : { assignedToId: user.id }),
      },
      orderBy: { startsAt: "asc" },
      include: {
        lead: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    db.lead.findMany({
      where: {
        organizationId: user.organizationId,
        stage: { notIn: ["WON", "LOST"] },
        ...(canSeeAll ? {} : { assignedToId: user.id }),
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.vehicle.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ["AVAILABLE", "RESERVED", "PENDING"] },
      },
      select: { id: true, brand: true, model: true, version: true, year: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AgendaClient
      events={appointments.map((appointment) => ({
        id: appointment.id,
        title: appointment.title,
        type: appointment.type,
        status: appointment.status,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        location: appointment.location,
        lead: appointment.lead,
        assignedTo: appointment.assignedTo,
      }))}
      leads={leads}
      sellers={sellers}
      vehicles={vehicles.map((vehicle) => ({
        id: vehicle.id,
        label: `${vehicleTitle(vehicle)} ${vehicle.year}`,
      }))}
    />
  );
}

export default async function AgendaPage() {
  await requirePermission("appointment:view");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
      />

      <Suspense fallback={<Skeleton className="h-[36rem] w-full rounded-xl" />}>
        <Agenda />
      </Suspense>
    </div>
  );
}
