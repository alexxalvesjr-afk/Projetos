import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Fuel,
  Gauge,
  MessageSquare,
  Settings2,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  daysBetween,
  formatCurrencyShort,
  formatMileage,
  formatModelYear,
  formatPercent,
} from "@/lib/format";
import {
  AGING_BANDS,
  agingBand,
  calculateProfit,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_VARIANTS,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import type { VehicleListItem } from "@/server/repositories/vehicle.repository";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";

export function VehicleCard({
  vehicle,
  showFinancials,
}: {
  vehicle: VehicleListItem;
  showFinancials: boolean;
}) {
  const cover = vehicle.images[0];
  const days = daysBetween(vehicle.purchasedAt);
  const band = agingBand(days);
  const expenses = vehicle.expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const { profitCents, marginPercent } = calculateProfit({
    priceCents: vehicle.priceCents,
    costCents: vehicle.costCents,
    expensesCents: expenses,
  });

  return (
    <Card interactive className="group overflow-hidden p-0">
      <Link href={`/inventory/${vehicle.id}`} className="block">
        {/* Cover ---------------------------------------------------------- */}
        <div className="bg-muted relative aspect-4/3 overflow-hidden">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt ?? vehicleTitle(vehicle)}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <Camera className="size-8" strokeWidth={1.5} />
            </div>
          )}

          {/* Status + aging sit on a scrim so they stay legible on any photo. */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/45 to-transparent p-3">
            <Badge
              variant={VEHICLE_STATUS_VARIANTS[vehicle.status]}
              className="shadow-xs"
            >
              {VEHICLE_STATUS_LABELS[vehicle.status]}
            </Badge>

            {vehicle.status !== "SOLD" ? (
              <Tooltip content={`Em estoque há ${days} dias`}>
                <Badge
                  variant={AGING_BANDS[band].variant}
                  size="sm"
                  className="shadow-xs"
                >
                  {days}d
                </Badge>
              </Tooltip>
            ) : null}
          </div>

          {vehicle.featured ? (
            <Badge className="absolute bottom-3 left-3 shadow-xs">
              Destaque
            </Badge>
          ) : null}

          {vehicle._count.leads > 0 ? (
            <Tooltip content={`${vehicle._count.leads} leads interessados`}>
              <span className="glass-strong absolute right-3 bottom-3 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium shadow-xs">
                <MessageSquare className="size-3" />
                {vehicle._count.leads}
              </span>
            </Tooltip>
          ) : null}
        </div>

        {/* Body ----------------------------------------------------------- */}
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="truncate text-sm leading-tight font-semibold">
              {vehicleTitle(vehicle)}
            </h3>
            <p className="text-muted-foreground truncate text-xs">
              {formatModelYear(vehicle.year, vehicle.modelYear)} ·{" "}
              {vehicle.color}
            </p>
          </div>

          <dl className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <div className="flex items-center gap-1">
              <Gauge className="size-3.5" />
              <dd>{formatMileage(vehicle.mileage)}</dd>
            </div>
            <div className="flex items-center gap-1">
              <Settings2 className="size-3.5" />
              <dd>{TRANSMISSION_LABELS[vehicle.transmission]}</dd>
            </div>
            <div className="flex items-center gap-1">
              <Fuel className="size-3.5" />
              <dd>{FUEL_LABELS[vehicle.fuel]}</dd>
            </div>
          </dl>

          <div className="flex items-end justify-between gap-2 border-t pt-3">
            <div>
              <p className="tabular text-lg leading-none font-semibold tracking-[-0.02em]">
                {formatCurrencyShort(vehicle.priceCents)}
              </p>
              {showFinancials ? (
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-xs font-medium",
                    profitCents >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  <TrendingUp className="size-3" />
                  {formatCurrencyShort(profitCents)} ·{" "}
                  {formatPercent(marginPercent, { digits: 0 })}
                </p>
              ) : null}
            </div>

            {vehicle.assignedTo ? (
              <Tooltip content={`Responsável: ${vehicle.assignedTo.name}`}>
                <span className="text-muted-foreground max-w-24 truncate text-xs">
                  {vehicle.assignedTo.name.split(" ")[0]}
                </span>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </Link>
    </Card>
  );
}

export function VehicleCardSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="skeleton aspect-4/3" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="border-t pt-3">
          <div className="skeleton h-5 w-24 rounded" />
        </div>
      </div>
    </Card>
  );
}
