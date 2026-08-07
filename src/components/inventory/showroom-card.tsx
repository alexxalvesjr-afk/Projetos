import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatMileage } from "@/lib/format";
import {
  publicPrice,
  VEHICLE_STATUS_LABELS,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import type { VehicleStatus } from "@prisma/client";

/**
 * O card do carro exatamente como o site da revenda o mostra.
 *
 * É o mesmo componente na listagem do estoque e no bloco "Outros carros
 * disponíveis" da ficha, de propósito: quando o lojista cadastra um veículo,
 * o que ele vê aqui é o que o cliente vê lá. Duas implementações do mesmo
 * card acabariam divergindo no primeiro ajuste de espaçamento.
 */
export type ShowroomVehicle = {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  mileage: number;
  priceCents: number;
  armored: boolean;
  status: VehicleStatus;
  images: { url: string; alt: string | null }[];
};

export function ShowroomCard({
  vehicle,
  className,
}: {
  vehicle: ShowroomVehicle;
  className?: string;
}) {
  const cover = vehicle.images[0];
  const title = vehicleTitle(vehicle);

  // No site, um carro vendido some da vitrine; aqui ele precisa continuar
  // visível — é estoque, não anúncio. O selo vermelho é o mesmo do site
  // ("BLINDADO"), e o status só toma esse lugar quando há o que avisar.
  const flag =
    vehicle.status === "AVAILABLE"
      ? vehicle.armored
        ? { label: "Blindado", tone: "brand" as const }
        : null
      : { label: VEHICLE_STATUS_LABELS[vehicle.status], tone: "neutral" as const };

  return (
    <Link
      href={`/inventory/${vehicle.id}`}
      className={cn(
        // `flex flex-col` para que, numa linha com um título de duas linhas,
        // todos os cards terminem o preço na mesma altura.
        "group bg-card ring-border/70 hover:ring-border flex h-full flex-col overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.25)] ring-1 transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_32px_-20px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="relative aspect-4/3 shrink-0 overflow-hidden">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt ?? title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <PhotoPlaceholder />
        )}

        <span className="bg-background/95 text-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs backdrop-blur-sm">
          {vehicle.year}
        </span>

        {flag ? (
          <span
            className={cn(
              "absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] uppercase shadow-xs",
              flag.tone === "brand"
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/85 text-background backdrop-blur-sm",
            )}
          >
            {flag.label}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">
            {title}
          </h3>
          <p className="text-muted-foreground text-[13px]">
            {vehicle.year}
            {vehicle.mileage > 0 ? ` · ${formatMileage(vehicle.mileage)}` : ""}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <span className="tabular text-[17px] leading-none font-bold tracking-[-0.02em]">
            {publicPrice(vehicle.priceCents)}
          </span>
          <span className="text-primary flex shrink-0 items-center gap-0.5 text-[13px] font-medium">
            Ver detalhes
            <ChevronRight className="size-3.5" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * O mesmo vazio que o site mostra enquanto não há fotos.
 *
 * Um ícone de câmera diria "componente de imagem"; esta legenda diz o que
 * falta. O carro já está cadastrado — o que ninguém subiu ainda é a foto.
 */
export function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900",
        className,
      )}
    >
      <span className="text-muted-foreground/60 text-[10px] font-medium tracking-[0.22em] uppercase">
        Foto do veículo
      </span>
    </div>
  );
}

export function ShowroomCardSkeleton() {
  return (
    <div className="bg-card ring-border/70 overflow-hidden rounded-2xl ring-1">
      <div className="skeleton aspect-4/3" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-5 w-28 rounded" />
      </div>
    </div>
  );
}
