import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();

const cents = z
  .number({ invalid_type_error: "Informe um valor" })
  .int("Use um valor inteiro em centavos")
  .min(0, "Não pode ser negativo")
  .max(999_999_999, "Valor acima do limite");

export const vehicleImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url("URL inválida"),
  fileKey: z.string().optional().nullable(),
  alt: z.string().max(160).optional().nullable(),
});

export const vehicleSchema = z
  .object({
    brand: z.string().min(1, "Informe a marca").max(40).trim(),
    model: z.string().min(1, "Informe o modelo").max(60).trim(),
    version: z.string().max(80).trim().optional().or(z.literal("")),

    year: z
      .number({ invalid_type_error: "Informe o ano" })
      .int()
      .min(1950, "Ano muito antigo")
      .max(CURRENT_YEAR + 1, "Ano acima do permitido"),
    modelYear: z
      .number()
      .int()
      .min(1950)
      .max(CURRENT_YEAR + 2)
      .optional()
      .nullable(),

    mileage: z
      .number({ invalid_type_error: "Informe a quilometragem" })
      .int()
      .min(0, "Não pode ser negativa")
      .max(2_000_000, "Quilometragem acima do limite"),

    transmission: z.enum([
      "MANUAL",
      "AUTOMATIC",
      "CVT",
      "AUTOMATED",
      "DUAL_CLUTCH",
    ]),
    fuel: z.enum([
      "FLEX",
      "GASOLINE",
      "ETHANOL",
      "DIESEL",
      "HYBRID",
      "ELECTRIC",
      "GNV",
    ]),
    bodyType: z
      .enum([
        "HATCH",
        "SEDAN",
        "SUV",
        "PICKUP",
        "COUPE",
        "CONVERTIBLE",
        "WAGON",
        "MINIVAN",
        "VAN",
      ])
      .optional()
      .nullable(),

    color: z.string().min(1, "Informe a cor").max(30).trim(),
    doors: z.number().int().min(2).max(5).optional().nullable(),
    engine: z.string().max(30).trim().optional().or(z.literal("")),
    plate: z
      .string()
      .max(10)
      .trim()
      .toUpperCase()
      .optional()
      .or(z.literal("")),
    vin: z.string().max(24).trim().toUpperCase().optional().or(z.literal("")),

    description: z.string().max(4000).optional().or(z.literal("")),
    accessories: z.array(z.string().max(60)).max(40).default([]),

    costCents: cents,
    minPriceCents: cents,
    priceCents: cents,

    status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "PENDING", "ARCHIVED"]),
    featured: z.boolean().default(false),
    published: z.boolean().default(true),

    purchasedAt: z.coerce.date().optional(),
    assignedToId: z.string().cuid().optional().nullable().or(z.literal("")),

    images: z.array(vehicleImageSchema).max(24).default([]),
  })
  // A floor above the asking price would let a salesperson "discount" upwards.
  .refine((data) => data.minPriceCents <= data.priceCents, {
    message: "O preço mínimo não pode ser maior que o preço de venda",
    path: ["minPriceCents"],
  });

export const vehicleUpdateSchema = z.object({
  id: z.string().cuid(),
  data: vehicleSchema,
});

export const vehicleStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "PENDING", "ARCHIVED"]),
});

export const vehicleDeleteSchema = z.object({ id: z.string().cuid() });

export const vehicleExpenseSchema = z.object({
  vehicleId: z.string().cuid(),
  description: z.string().min(1, "Descreva a despesa").max(120).trim(),
  category: z.enum([
    "ACQUISITION",
    "RECONDITIONING",
    "DOCUMENTATION",
    "TRANSPORT",
    "MARKETING",
    "COMMISSION",
    "OVERHEAD",
    "OTHER",
  ]),
  amountCents: cents.min(1, "Informe um valor"),
  incurredAt: z.coerce.date().optional(),
});

/** Query-string filters for the inventory list. */
export const vehicleFilterSchema = z.object({
  q: z.string().max(80).optional(),
  status: z.string().optional(),
  brand: z.string().optional(),
  transmission: z.string().optional(),
  fuel: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minYear: z.coerce.number().optional(),
  maxYear: z.coerce.number().optional(),
  maxMileage: z.coerce.number().optional(),
  sort: z
    .enum([
      "recent",
      "oldest",
      "price_asc",
      "price_desc",
      "mileage_asc",
      "year_desc",
      "aging_desc",
    ])
    .default("recent"),
  view: z.enum(["grid", "table"]).default("grid"),
  page: z.coerce.number().int().min(1).default(1),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleExpenseInput = z.infer<typeof vehicleExpenseSchema>;
export type VehicleFilterInput = z.infer<typeof vehicleFilterSchema>;
