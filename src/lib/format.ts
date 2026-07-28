/**
 * All user-facing value formatting lives here. Money is stored as integer cents
 * everywhere in the system and only becomes a decimal at this boundary.
 */

const DEFAULT_LOCALE = "pt-BR";
const DEFAULT_CURRENCY = "BRL";

/** `1234567` cents → `R$ 12.345,67` */
export function formatCurrency(
  cents: number,
  options: { locale?: string; currency?: string; compact?: boolean } = {},
): string {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    compact = false,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(cents / 100);
}

/** Drops the decimals — used in dense tables and KPI headlines. */
export function formatCurrencyShort(cents: number, locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCompact(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(
  value: number,
  { digits = 1, locale = DEFAULT_LOCALE } = {},
): string {
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

/** Signed percentage for deltas: `+12,4%` / `−3,1%`. */
export function formatDelta(value: number | null, locale = DEFAULT_LOCALE) {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(Math.abs(value))}%`;
}

export function formatMileage(km: number, locale = DEFAULT_LOCALE): string {
  return `${new Intl.NumberFormat(locale).format(km)} km`;
}

export function formatDate(
  date: Date | string | null | undefined,
  style: "short" | "medium" | "long" = "medium",
  locale = DEFAULT_LOCALE,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "2-digit", month: "2-digit", year: "2-digit" }
      : style === "long"
        ? { day: "2-digit", month: "long", year: "numeric" }
        : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatTime(
  date: Date | string,
  locale = DEFAULT_LOCALE,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** "há 3 dias" / "em 2 horas" — powered by Intl so it localises for free. */
export function formatRelative(
  date: Date | string,
  locale = DEFAULT_LOCALE,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(Math.round(diffMs / 1000), "second");
}

/** Days a unit has been sitting in stock — the aging metric. */
export function daysBetween(from: Date | string, to: Date | string = new Date()) {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.max(
    0,
    Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

/** `2023` + `2024` → `2023/2024`, collapsing to `2024` when they match. */
export function formatModelYear(year: number, modelYear?: number | null) {
  if (!modelYear || modelYear === year) return String(year);
  return `${year}/${modelYear}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export function formatPlate(plate: string | null | undefined): string {
  if (!plate) return "—";
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length === 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

/** Parses "R$ 12.345,67" or "12345.67" into integer cents. */
export function parseCurrencyToCents(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d,.-]/g, "");
  // pt-BR uses "." for thousands and "," for decimals.
  const normalised = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number.parseFloat(normalised);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}
