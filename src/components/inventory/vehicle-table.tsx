import Link from "next/link";
import Image from "next/image";
import { Camera } from "lucide-react";

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
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_VARIANTS,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import type { VehicleListItem } from "@/server/repositories/vehicle.repository";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Dense view for operators working the whole stock at once. */
export function VehicleTable({
  vehicles,
  showFinancials,
}: {
  vehicles: VehicleListItem[];
  showFinancials: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Veículo</TableHead>
          <TableHead>Ano</TableHead>
          <TableHead>Km</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Preço</TableHead>
          {showFinancials ? (
            <>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
            </>
          ) : null}
          <TableHead className="text-right">Estoque</TableHead>
          <TableHead>Responsável</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {vehicles.map((vehicle) => {
          const cover = vehicle.images[0];
          const days = daysBetween(vehicle.purchasedAt);
          const band = agingBand(days);
          const expenses = vehicle.expenses.reduce(
            (sum, expense) => sum + expense.amountCents,
            0,
          );
          const { profitCents, marginPercent } = calculateProfit({
            priceCents: vehicle.priceCents,
            costCents: vehicle.costCents,
            expensesCents: expenses,
          });

          return (
            <TableRow key={vehicle.id}>
              <TableCell>
                <Link
                  href={`/inventory/${vehicle.id}`}
                  className="flex items-center gap-3"
                >
                  <span className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-lg">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground flex size-full items-center justify-center">
                        <Camera className="size-4" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-56 truncate text-sm font-medium">
                      {vehicleTitle(vehicle)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {vehicle.color}
                    </span>
                  </span>
                </Link>
              </TableCell>

              <TableCell className="tabular text-sm whitespace-nowrap">
                {formatModelYear(vehicle.year, vehicle.modelYear)}
              </TableCell>

              <TableCell className="tabular text-muted-foreground text-sm whitespace-nowrap">
                {formatMileage(vehicle.mileage)}
              </TableCell>

              <TableCell>
                <Badge
                  variant={VEHICLE_STATUS_VARIANTS[vehicle.status]}
                  size="sm"
                >
                  {VEHICLE_STATUS_LABELS[vehicle.status]}
                </Badge>
              </TableCell>

              <TableCell className="tabular text-right text-sm font-medium whitespace-nowrap">
                {formatCurrencyShort(vehicle.priceCents)}
              </TableCell>

              {showFinancials ? (
                <>
                  <TableCell className="tabular text-muted-foreground text-right text-sm whitespace-nowrap">
                    {formatCurrencyShort(vehicle.costCents + expenses)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right text-sm font-medium whitespace-nowrap",
                      profitCents >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {formatCurrencyShort(profitCents)}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      {formatPercent(marginPercent, { digits: 0 })}
                    </span>
                  </TableCell>
                </>
              ) : null}

              <TableCell className="text-right">
                {vehicle.status === "SOLD" ? (
                  <span className="text-muted-foreground text-sm">—</span>
                ) : (
                  <Badge variant={AGING_BANDS[band].variant} size="sm">
                    {days}d
                  </Badge>
                )}
              </TableCell>

              <TableCell className="text-muted-foreground max-w-32 truncate text-sm">
                {vehicle.assignedTo?.name ?? "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
