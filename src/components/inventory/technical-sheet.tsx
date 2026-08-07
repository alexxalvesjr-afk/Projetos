import { formatNumber } from "@/lib/format";
import { BODY_TYPE_LABELS } from "@/lib/domain/vehicle";
import type { BodyType } from "@prisma/client";

export type TechnicalSheetVehicle = {
  engine: string | null;
  plate: string | null;
  bodyType: BodyType | null;
  steering: string | null;
  traction: string | null;
  horsepower: number | null;
  seats: number | null;
  valvesPerCylinder: number | null;
  fuelTankLiters: number | null;
  wheelbaseMm: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
};

/** Só entra na ficha o que foi preenchido — um traço em cada linha vazia
 *  transformaria a tabela num inventário do que falta, e o comprador não
 *  precisa dessa informação. */
function rows(vehicle: TechnicalSheetVehicle) {
  const mm = (value: number) => `${formatNumber(value)} mm`;

  const dimensions =
    vehicle.lengthMm && vehicle.widthMm && vehicle.heightMm
      ? [vehicle.lengthMm, vehicle.widthMm, vehicle.heightMm].map(mm).join(" x ")
      : null;

  // O site publica só o último dígito da placa — o suficiente para o rodízio,
  // sem expor a placa inteira de um carro que ainda está no pátio.
  const plateDigit = vehicle.plate?.trim().match(/(\d)(?!.*\d)/)?.[1] ?? null;

  const all: [string, string | null][] = [
    ["Motor", vehicle.engine || null],
    ["Último dígito da placa", plateDigit],
    ["Direção", vehicle.steering || null],
    ["Quantidade de pessoas", vehicle.seats ? String(vehicle.seats) : null],
    ["Distância entre eixos", vehicle.wheelbaseMm ? mm(vehicle.wheelbaseMm) : null],
    [
      "Válvulas por cilindro",
      vehicle.valvesPerCylinder ? String(vehicle.valvesPerCylinder) : null,
    ],
    ["Tipo de carroceria", vehicle.bodyType ? BODY_TYPE_LABELS[vehicle.bodyType] : null],
    ["Comprimento x Largura x Altura", dimensions],
    ["Tração", vehicle.traction || null],
    ["Potência", vehicle.horsepower ? `${formatNumber(vehicle.horsepower)} cv` : null],
    [
      "Tanque de combustível",
      vehicle.fuelTankLiters ? `${formatNumber(vehicle.fuelTankLiters)} L` : null,
    ],
  ];

  return all.filter((row): row is [string, string] => Boolean(row[1]));
}

export function TechnicalSheet({ vehicle }: { vehicle: TechnicalSheetVehicle }) {
  const items = rows(vehicle);
  if (items.length === 0) return null;

  // Duas colunas independentes, como no site: a primeira metade à esquerda,
  // o resto à direita. Preenchida uma linha, ela cresce onde já estava.
  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)];

  return (
    <section className="bg-card ring-border/70 rounded-2xl p-6 ring-1">
      <h2 className="text-base font-semibold">Ficha técnica</h2>

      <div className="mt-4 grid gap-x-10 md:grid-cols-2">
        {columns.map((column, index) => (
          <dl key={index} className="text-sm">
            {column.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </section>
  );
}
