import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * URL-safe slug. Strips diacritics first so "Citroën C4" becomes "citroen-c4"
 * rather than losing the character entirely.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Deterministic initials for avatar fallbacks. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Stable pastel colour derived from a string — used for avatars and chart
 * series so the same entity keeps the same colour across renders.
 */
export function colorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `oklch(0.68 0.14 ${hue})`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Safe percentage — returns 0 rather than NaN/Infinity when the base is 0. */
export function percent(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

/** Growth between two periods, guarding the divide-by-zero case. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

export function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

/** Debounce for client-side search inputs. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms = 300,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Strips everything but digits — phone numbers, tax IDs, plates. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Builds a wa.me deep link. Brazilian numbers are normalised to E.164 with the
 * 55 country code when the caller passes a local number.
 */
export function whatsappLink(phone: string, message?: string): string {
  let digits = digitsOnly(phone);
  if (digits.length <= 11) digits = `55${digits}`;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(phone: string): string {
  return `tel:${digitsOnly(phone)}`;
}

export function mailtoLink(email: string, subject?: string): string {
  return subject
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;
}
