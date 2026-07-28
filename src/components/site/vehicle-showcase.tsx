import Link from "next/link";
import Image from "next/image";
import { Camera, Fuel, Gauge, Settings2 } from "lucide-react";

import { formatCurrencyShort, formatMileage, formatModelYear } from "@/lib/format";
import {
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import type { FuelType, Transmission } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export type ShowcaseVehicle = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  modelYear: number | null;
  mileage: number;
  transmission: Transmission;
  fuel: FuelType;
  color: string;
  priceCents: number;
  status: string;
  featured: boolean;
  images: { url: string; alt: string | null }[];
};

/** Public-facing vehicle card. Deliberately shows no cost or margin data. */
export function VehicleShowcaseCard({
  vehicle,
  storeSlug,
  priority = false,
}: {
  vehicle: ShowcaseVehicle;
  storeSlug: string;
  priority?: boolean;
}) {
  const cover = vehicle.images[0];

  return (
    <article className="group bg-card overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/loja/${storeSlug}/veiculo/${vehicle.slug}`}>
        <div className="bg-muted relative aspect-4/3 overflow-hidden">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt ?? vehicleTitle(vehicle)}
              fill
              // The first row is above the fold on the listing page.
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <Camera className="size-8" strokeWidth={1.5} />
            </div>
          )}

          {vehicle.status === "RESERVED" ? (
            <Badge variant="warning" className="absolute top-3 left-3 shadow-xs">
              Reservado
            </Badge>
          ) : vehicle.featured ? (
            <Badge className="absolute top-3 left-3 shadow-xs">Destaque</Badge>
          ) : null}
        </div>

        <div className="space-y-3 p-5">
          <div className="space-y-1">
            <h3 className="truncate font-semibold tracking-[-0.01em]">
              {vehicleTitle(vehicle)}
            </h3>
            <p className="text-muted-foreground text-sm">
              {formatModelYear(vehicle.year, vehicle.modelYear)} ·{" "}
              {vehicle.color}
            </p>
          </div>

          <dl className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <Gauge className="size-3.5" />
              <dd>{formatMileage(vehicle.mileage)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Settings2 className="size-3.5" />
              <dd>{TRANSMISSION_LABELS[vehicle.transmission]}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel className="size-3.5" />
              <dd>{FUEL_LABELS[vehicle.fuel]}</dd>
            </div>
          </dl>

          <div className="border-t pt-3">
            <p className="text-muted-foreground text-xs">A partir de</p>
            <p className="tabular text-xl font-semibold tracking-[-0.02em]">
              {formatCurrencyShort(vehicle.priceCents)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
