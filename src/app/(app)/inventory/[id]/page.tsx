import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Eye, Lock, Receipt, UserRound } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  daysBetween,
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/format";
import {
  AGING_BANDS,
  agingBand,
  calculateProfit,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_VARIANTS,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import { STAGE_LABELS } from "@/lib/domain/lead";
import { vehicleRepository } from "@/server/repositories/vehicle.repository";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VehicleGallery } from "@/components/inventory/vehicle-gallery";
import { VehicleActions } from "@/components/inventory/vehicle-actions";
import { ShowroomPanel } from "@/components/inventory/showroom-panel";
import { ShowroomCard } from "@/components/inventory/showroom-card";
import { TechnicalSheet } from "@/components/inventory/technical-sheet";
import { AccessoriesList } from "@/components/inventory/accessories-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await requirePermission("vehicle:view");
  const { id } = await params;
  const vehicle = await vehicleRepository.findById(user.organizationId, id);

  return { title: vehicle ? vehicleTitle(vehicle) : "Veículo" };
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("vehicle:view");
  const { id } = await params;

  const vehicle = await vehicleRepository.findById(user.organizationId, id);
  if (!vehicle) notFound();

  const [peers, organization] = await Promise.all([
    vehicleRepository.showroomPeers(user.organizationId, vehicle.id),
    db.organization.findUnique({
      where: { id: user.organizationId },
      select: { whatsapp: true, phone: true },
    }),
  ]);

  const showFinancials = hasPermission(user.role, "vehicle:view_cost");
  const canUpdate = hasPermission(user.role, "vehicle:update");
  const canDelete = hasPermission(user.role, "vehicle:delete");

  const expensesCents = vehicle.expenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );
  const profit = calculateProfit({
    priceCents: vehicle.priceCents,
    costCents: vehicle.costCents,
    expensesCents,
  });

  const days = daysBetween(vehicle.purchasedAt, vehicle.soldAt ?? new Date());
  const band = agingBand(days);
  const title = vehicleTitle(vehicle);

  return (
    <div className="space-y-6">
      {/* Barra de contexto. O título fica no anúncio, como no site — repeti-lo
          aqui empurraria a foto para baixo sem dizer nada de novo. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Trilha de navegação"
          className="text-muted-foreground flex min-w-0 items-center gap-1 text-sm"
        >
          <Link href="/inventory" className="hover:text-foreground transition-colors">
            Estoque
          </Link>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-foreground truncate font-medium">{title}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={VEHICLE_STATUS_VARIANTS[vehicle.status]}>
            {VEHICLE_STATUS_LABELS[vehicle.status]}
          </Badge>
          {vehicle.status === "SOLD" ? (
            <Badge variant="secondary" size="sm">
              Vendido em {formatDate(vehicle.soldAt)}
            </Badge>
          ) : (
            <Badge variant={AGING_BANDS[band].variant} size="sm">
              {days} dias em estoque
            </Badge>
          )}
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Eye className="size-3.5" />
            {vehicle.viewCount}
          </span>

          <VehicleActions
            vehicleId={vehicle.id}
            status={vehicle.status}
            published={vehicle.published}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      {/* Anúncio ----------------------------------------------------------- */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <VehicleGallery images={vehicle.images} alt={title} />
        <ShowroomPanel
          vehicle={vehicle}
          whatsapp={organization?.whatsapp ?? organization?.phone ?? null}
        />
      </div>

      <TechnicalSheet vehicle={vehicle} />

      {vehicle.accessories.length > 0 ? (
        <AccessoriesList items={vehicle.accessories} />
      ) : null}

      {vehicle.description ? (
        <section className="bg-card ring-border/70 rounded-2xl p-6 ring-1">
          <h2 className="text-base font-semibold">Descrição</h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed whitespace-pre-line">
            {vehicle.description}
          </p>
        </section>
      ) : null}

      {peers.length > 0 ? (
        <section className="bg-card ring-border/70 rounded-2xl p-6 ring-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Outros carros disponíveis</h2>
            <Link
              href="/inventory"
              className="text-primary flex shrink-0 items-center gap-0.5 text-[13px] font-medium"
            >
              Ver todos
              <ChevronRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {peers.map((peer) => (
              <ShowroomCard key={peer.id} vehicle={peer} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Gestão ------------------------------------------------------------
          Tudo daqui para baixo é da equipe. A faixa existe para que ninguém
          confunda margem e custo com algo que o site publica. */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] uppercase">
          <Lock className="size-3.5" />
          Uso interno
        </span>
        <span className="bg-border h-px flex-1" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Precificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground text-xs">Preço de venda</p>
              <p className="tabular text-3xl leading-tight font-semibold tracking-[-0.03em]">
                {formatCurrency(vehicle.priceCents)}
              </p>
            </div>

            {showFinancials ? (
              <>
                <Separator />
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Custo de aquisição</dt>
                    <dd className="tabular font-medium">
                      {formatCurrency(vehicle.costCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Despesas</dt>
                    <dd className="tabular font-medium">
                      {formatCurrency(expensesCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Preço mínimo</dt>
                    <dd className="tabular font-medium">
                      {formatCurrency(vehicle.minPriceCents)}
                    </dd>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <dt className="font-medium">Lucro previsto</dt>
                    <dd
                      className={cn(
                        "tabular font-semibold",
                        profit.profitCents >= 0
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {formatCurrency(profit.profitCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Margem / ROI</dt>
                    <dd className="tabular text-muted-foreground font-medium">
                      {formatPercent(profit.marginPercent)} ·{" "}
                      {formatPercent(profit.roiPercent)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : null}
          </CardContent>
        </Card>

        {showFinancials ? (
          <Card>
            <CardHeader>
              <CardTitle>Despesas</CardTitle>
              <CardDescription>
                Preparação, documentação e transporte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vehicle.expenses.length === 0 ? (
                <EmptyState
                  compact
                  icon={Receipt}
                  title="Nenhuma despesa lançada"
                  description="Registre custos de preparação para acompanhar a margem real."
                />
              ) : (
                <ul className="divide-y text-sm">
                  {vehicle.expenses.map((expense) => (
                    <li
                      key={expense.id}
                      className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {expense.description}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(expense.incurredAt, "short")}
                        </p>
                      </div>
                      <span className="tabular shrink-0 font-medium">
                        {formatCurrency(expense.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Leads interessados</CardTitle>
            {vehicle.assignedTo ? (
              <CardDescription>
                Responsável: {vehicle.assignedTo.name}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {vehicle.leads.length === 0 ? (
              <EmptyState
                compact
                icon={UserRound}
                title="Nenhum lead ainda"
                description="Interessados por este veículo aparecem aqui."
              />
            ) : (
              <ul className="divide-y">
                {vehicle.leads.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/crm/${lead.id}`}
                      className="hover:bg-accent/60 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {lead.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(lead.createdAt, "short")}
                        </p>
                      </div>
                      <Badge variant="outline" size="sm">
                        {STAGE_LABELS[lead.stage]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
