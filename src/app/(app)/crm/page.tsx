import type { Metadata } from "next";
import { Suspense } from "react";
import type { LeadStage } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission, leadVisibilityFilter } from "@/lib/rbac";
import { formatPercent } from "@/lib/format";
import { PIPELINE_STAGES } from "@/lib/domain/lead";
import { vehicleTitle } from "@/lib/domain/vehicle";
import { leadRepository, type LeadCard } from "@/server/repositories/lead.repository";
import { metricsRepository, monthPeriod } from "@/server/repositories/metrics.repository";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { LeadDialog } from "@/components/crm/lead-dialog";

export const metadata: Metadata = {
  title: "Clientes",
  description: "Acompanhe cada oportunidade da sua revenda.",
};

export const dynamic = "force-dynamic";

async function Pipeline() {
  const user = await requirePermission("lead:view");

  const visibility = leadVisibilityFilter(user.role, user.id);
  const canAssign = hasPermission(user.role, "lead:assign");

  const [board, leadStats, vehicles, sellers] = await Promise.all([
    leadRepository.board(user.organizationId, undefined, visibility),
    metricsRepository.leadSummary(
      user.organizationId,
      monthPeriod(),
      visibility?.assignedToId,
    ),
    db.vehicle.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ["AVAILABLE", "RESERVED", "PENDING"] },
      },
      select: { id: true, brand: true, model: true, version: true, year: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    canAssign
      ? db.user.findMany({
          where: { organizationId: user.organizationId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // The repository returns a Map; the board wants a full record so every column
  // renders even when it is empty.
  const columns = Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage.id, board.get(stage.id) ?? []]),
  ) as Record<LeadStage, LeadCard[]>;

  const summary = [
    { label: "Leads no mês", value: leadStats.created },
    { label: "Em aberto", value: leadStats.open },
    { label: "Ganhos no mês", value: leadStats.won },
    {
      label: "Conversão",
      value: formatPercent(leadStats.conversionRate),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="px-4 py-3.5">
              <p className="text-muted-foreground text-xs font-medium">
                {item.label}
              </p>
              <p className="tabular mt-1 text-xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <LeadDialog
          canAssign={canAssign}
          sellers={sellers}
          vehicles={vehicles.map((vehicle) => ({
            id: vehicle.id,
            label: `${vehicleTitle(vehicle)} ${vehicle.year}`,
          }))}
        />
      </div>

      <KanbanBoard initial={columns} />
    </div>
  );
}

export default async function CrmPage() {
  await requirePermission("lead:view");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
      />

      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[74px] rounded-xl" />
              ))}
            </div>
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        }
      >
        <Pipeline />
      </Suspense>
    </div>
  );
}
