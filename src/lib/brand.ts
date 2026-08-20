/**
 * Brand constants — the single source of truth for every name, slogan and
 * legal string the product renders.
 *
 * Colour is not here on purpose: it lives in `app/globals.css` as OKLCH
 * tokens, so a rebrand touches exactly two files — this one for words, that
 * one for palette.
 */
export const BRAND = {
  /** Wordmark shown next to the logo mark. */
  name: "Duboss",
  /** Full commercial name of the dealership. */
  company: "Duboss Motors",
  /** Product name used in titles and metadata. */
  product: "Duboss CRM",
  /** Registered name, used on invoices and the storefront footer. */
  legalName: "Duboss Motors Comércio de Veículos LTDA",
  /** One-line positioning, used as the metadata title suffix. */
  tagline: "o sistema operacional da Duboss Motors",
  /** Footer line. */
  footer: "Veículos premium e embarcações.",
  /** Seed/demo credentials domain. */
  emailDomain: "dubossmotors.com.br",
} as const;
