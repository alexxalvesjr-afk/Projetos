import type {
  BodyType,
  FuelType,
  Transmission,
  VehicleStatus,
} from "@prisma/client";

import { formatModelYear, formatMileage } from "@/lib/format";
import { slugify } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  PENDING: "Em preparação",
  ARCHIVED: "Arquivado",
};

export const VEHICLE_STATUS_VARIANTS: Record<
  VehicleStatus,
  "success" | "warning" | "secondary" | "info" | "outline"
> = {
  AVAILABLE: "success",
  RESERVED: "warning",
  SOLD: "secondary",
  PENDING: "info",
  ARCHIVED: "outline",
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automático",
  CVT: "CVT",
  AUTOMATED: "Automatizado",
  DUAL_CLUTCH: "Dupla embreagem",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  FLEX: "Flex",
  GASOLINE: "Gasolina",
  ETHANOL: "Etanol",
  DIESEL: "Diesel",
  HYBRID: "Híbrido",
  ELECTRIC: "Elétrico",
  GNV: "GNV",
};

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  HATCH: "Hatch",
  SEDAN: "Sedã",
  SUV: "SUV",
  PICKUP: "Picape",
  COUPE: "Cupê",
  CONVERTIBLE: "Conversível",
  WAGON: "Perua",
  MINIVAN: "Minivan",
  VAN: "Van",
};

/** Curated accessory catalogue offered as toggles on the vehicle form. */
export const ACCESSORY_OPTIONS = [
  "Ar-condicionado",
  "Direção elétrica",
  "Vidros elétricos",
  "Travas elétricas",
  "Airbag duplo",
  "Freios ABS",
  "Central multimídia",
  "Câmera de ré",
  "Sensor de estacionamento",
  "Piloto automático",
  "Bancos em couro",
  "Teto solar",
  "Rodas de liga leve",
  "Faróis de LED",
  "Controle de tração",
  "Start/Stop",
  "Carregador por indução",
  "Apple CarPlay / Android Auto",
] as const;

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export type ProfitInput = {
  priceCents: number;
  costCents: number;
  /** Post-acquisition costs: reconditioning, documentation, transport… */
  expensesCents?: number;
};

export type ProfitBreakdown = {
  /** Everything the unit has consumed so far. */
  totalCostCents: number;
  profitCents: number;
  /** Profit as a share of the sale price. */
  marginPercent: number;
  /** Profit as a share of invested capital — the number owners care about. */
  roiPercent: number;
};

/**
 * The single definition of profit in the system. Every screen that shows a
 * margin routes through here, so the dashboard, the vehicle card and the
 * reports can never disagree with one another.
 */
export function calculateProfit({
  priceCents,
  costCents,
  expensesCents = 0,
}: ProfitInput): ProfitBreakdown {
  const totalCostCents = costCents + expensesCents;
  const profitCents = priceCents - totalCostCents;

  return {
    totalCostCents,
    profitCents,
    marginPercent: priceCents > 0 ? (profitCents / priceCents) * 100 : 0,
    roiPercent: totalCostCents > 0 ? (profitCents / totalCostCents) * 100 : 0,
  };
}

/**
 * Floor price guard. Returns the discount headroom a salesperson has before
 * they breach the configured minimum.
 */
export function negotiationHeadroom(
  priceCents: number,
  minPriceCents: number,
): { headroomCents: number; headroomPercent: number } {
  const headroomCents = Math.max(0, priceCents - minPriceCents);
  return {
    headroomCents,
    headroomPercent: priceCents > 0 ? (headroomCents / priceCents) * 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export type VehicleNameParts = {
  brand: string;
  model: string;
  version?: string | null;
  year: number;
  modelYear?: number | null;
};

export function vehicleTitle(v: VehicleNameParts): string {
  return [v.brand, v.model, v.version].filter(Boolean).join(" ");
}

export function vehicleFullTitle(v: VehicleNameParts): string {
  return `${vehicleTitle(v)} ${formatModelYear(v.year, v.modelYear)}`;
}

/**
 * Storefront slug. The trailing token keeps URLs unique when a dealership
 * stocks two identical cars, without exposing a raw database id.
 */
export function buildVehicleSlug(
  v: VehicleNameParts,
  uniqueToken: string,
): string {
  return `${slugify(vehicleTitle(v))}-${v.year}-${uniqueToken.slice(-6).toLowerCase()}`;
}

export function vehicleSummaryLine(v: {
  year: number;
  modelYear?: number | null;
  mileage: number;
  transmission: Transmission;
  fuel: FuelType;
}): string {
  return [
    formatModelYear(v.year, v.modelYear),
    formatMileage(v.mileage),
    TRANSMISSION_LABELS[v.transmission],
    FUEL_LABELS[v.fuel],
  ].join(" · ");
}

// ---------------------------------------------------------------------------
// Stock aging
// ---------------------------------------------------------------------------

export type AgingBand = "fresh" | "healthy" | "watch" | "stale";

export const AGING_BANDS: Record<
  AgingBand,
  { label: string; max: number; variant: "success" | "info" | "warning" | "destructive" }
> = {
  fresh: { label: "0–30 dias", max: 30, variant: "success" },
  healthy: { label: "31–60 dias", max: 60, variant: "info" },
  watch: { label: "61–90 dias", max: 90, variant: "warning" },
  stale: { label: "90+ dias", max: Infinity, variant: "destructive" },
};

/** Buckets a unit by how long capital has been tied up in it. */
export function agingBand(days: number): AgingBand {
  if (days <= 30) return "fresh";
  if (days <= 60) return "healthy";
  if (days <= 90) return "watch";
  return "stale";
}
