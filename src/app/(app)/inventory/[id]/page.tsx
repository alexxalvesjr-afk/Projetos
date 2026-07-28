import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Eye,
  Receipt,
  TrendingUp,
  UserRound,
} from "lucide-react";

import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  daysBetween,
  formatCurrency,
  formatDate,
  formatMileage,
  formatModelYear,
  formatPercent,
  formatPlate,
} from "@/lib/format";
import {
  AGING_BANDS,
  agingBand,
  BODY_TYPE_LABELS,
  calculateProfit,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_VARIANTS,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import { STAGE_LABELS } from "@/lib/domain/lead";
import { vehicleRepository } from "@/server/repositories/vehicle.repository";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const specs = [
    ["Ano", formatModelYear(vehicle.year, vehicle.modelYear)],
    ["Quilometragem", formatMileage(vehicle.mileage)],
    ["Câmbio", TRANSMISSION_LABELS[vehicle.transmission]],
    ["Combustível", FUEL_LABELS[vehicle.fuel]],
    ["Cor", vehicle.color],
    [
      "Carroceria",
      vehicle.bodyType ? BODY_TYPE_LABELS[vehicle.bodyType] : "—",
    ],
    ["Portas", vehicle.doors ? String(vehicle.doors) : "—"],
    ["Motor", vehicle.engine ?? "—"],
    ["Placa", formatPlate(vehicle.plate)],
    ["Entrada no estoque", formatDate(vehicle.purchasedAt)],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2">
          <Link href="/inventory">
            <ArrowLeft />
            Voltar ao estoque
          </Link>
        </Button>

        <PageHeader
          title={vehicleTitle(vehicle)}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={VEHICLE_STATUS_VARIANTS[vehicle.status]}>
                {VEHICLE_STATUS_LABELS[vehicle.status]}
              </Badge>
              {vehicle.status !== "SOLD" ? (
                <Badge variant={AGING_BANDS[band].variant} size="sm">
                  {days} dias em estoque
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm">
                  Vendido em {formatDate(vehicle.soldAt)}
                </Badge>
              )}
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Eye className="size-3.5" />
                {vehicle.viewCount} visualizações no site
              </span>
            </span>
          }
        >
          <VehicleActions
            vehicleId={vehicle.id}
            vehicleSlug={vehicle.slug}
            organizationSlug={user.organizationSlug}
            status={vehicle.status}
            published={vehicle.published}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </PageHeader>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column ----------------------------------------------------- */}
        <div className="space-y-6 lg:col-span-2">
          <VehicleGallery
            images={vehicle.images}
            alt={vehicleTitle(vehicle)}
          />

          <Card>
            <CardHeader>
              <CardTitle>Ficha técnica</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
                {specs.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {vehicle.accessories.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Opcionais</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {vehicle.accessories.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="text-success size-4 shrink-0" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {vehicle.description ? (
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {vehicle.description}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right column ---------------------------------------------------- */}
        <div className="space-y-6">
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

          {vehicle.assignedTo ? (
            <Card>
              <CardHeader>
                <CardTitle>Responsável</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm">
                <TrendingUp className="text-muted-foreground size-4" />
                {vehicle.assignedTo.name}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
