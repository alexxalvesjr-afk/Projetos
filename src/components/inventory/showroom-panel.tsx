import {
  CalendarDays,
  Check,
  DoorOpen,
  Fuel,
  Gauge,
  Palette,
  Settings2,
} from "lucide-react";

import { whatsappLink } from "@/lib/utils";
import { formatMileage, formatModelYear } from "@/lib/format";
import {
  FUEL_LABELS,
  publicPrice,
  TRANSMISSION_LABELS,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import { WhatsappIcon } from "@/components/shared/whatsapp-icon";
import type { FuelType, Transmission } from "@prisma/client";

/**
 * O bloco de venda do anúncio: marca, preço, os seis dados que o comprador
 * procura primeiro e o botão que leva à conversa.
 *
 * É a réplica do painel do site, e serve como prévia fiel: o que o lojista lê
 * aqui depois de cadastrar é o que o cliente lê lá.
 */
export function ShowroomPanel({
  vehicle,
  whatsapp,
}: {
  vehicle: {
    brand: string;
    model: string;
    version: string | null;
    year: number;
    modelYear: number | null;
    mileage: number;
    transmission: Transmission;
    fuel: FuelType;
    color: string;
    doors: number | null;
    priceCents: number;
    armored: boolean;
  };
  /** Telefone da loja. Sem ele o botão não teria para onde ir. */
  whatsapp: string | null;
}) {
  const title = vehicleTitle(vehicle);

  const specs = [
    { icon: CalendarDays, label: "Ano", value: formatModelYear(vehicle.year, vehicle.modelYear) },
    { icon: Gauge, label: "Quilometragem", value: formatMileage(vehicle.mileage) },
    { icon: Settings2, label: "Câmbio", value: TRANSMISSION_LABELS[vehicle.transmission] },
    { icon: Fuel, label: "Combustível", value: FUEL_LABELS[vehicle.fuel] },
    { icon: Palette, label: "Cor", value: vehicle.color },
    {
      icon: DoorOpen,
      label: "Portas",
      value: vehicle.doors ? `${vehicle.doors} portas` : "—",
    },
  ];

  return (
    <div className="bg-card ring-border/70 rounded-2xl p-6 ring-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-primary flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase">
          <span className="bg-primary inline-block h-0.5 w-4 rounded-full" />
          {vehicle.brand} · {vehicle.year}
        </p>

        {vehicle.armored ? (
          <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] uppercase">
            Blindado
          </span>
        ) : null}
      </div>

      <h1 className="mt-2.5 text-[22px] leading-tight font-bold tracking-[-0.02em]">
        {title}
      </h1>

      <p className="text-muted-foreground mt-5 text-[10px] font-medium tracking-[0.18em] uppercase">
        Valor
      </p>
      <p className="tabular mt-0.5 text-[26px] leading-tight font-bold tracking-[-0.03em]">
        {publicPrice(vehicle.priceCents)}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-2.5">
        {specs.map((spec) => (
          <div key={spec.label} className="ring-border/70 rounded-xl px-3 py-2.5 ring-1">
            <dt className="text-muted-foreground flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.12em] uppercase">
              <spec.icon className="text-primary size-3" />
              {spec.label}
            </dt>
            <dd className="mt-1 truncate text-sm font-medium">{spec.value}</dd>
          </div>
        ))}
      </dl>

      {whatsapp ? (
        <a
          href={whatsappLink(
            whatsapp,
            `Olá! Tenho interesse no ${title} (${publicPrice(vehicle.priceCents)})`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-ring mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <WhatsappIcon className="size-4.5" />
          Falar com um vendedor
        </a>
      ) : null}

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1">
          <Check className="text-success size-3" strokeWidth={3} />
          Procedência verificada
        </span>
        <span className="flex items-center gap-1">
          <Check className="text-success size-3" strokeWidth={3} />
          Documentação completa
        </span>
      </div>
    </div>
  );
}
