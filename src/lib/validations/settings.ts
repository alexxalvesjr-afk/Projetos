import { z } from "zod";

const optionalUrl = z
  .string()
  .url("URL inválida")
  .optional()
  .or(z.literal(""))
  .nullable();

export const organizationSchema = z.object({
  name: z.string().min(2, "Informe o nome").max(80).trim(),
  legalName: z.string().max(120).optional().or(z.literal("")),
  taxId: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  addressLine: z.string().max(160).optional().or(z.literal("")),
  city: z.string().max(60).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  postalCode: z.string().max(12).optional().or(z.literal("")),
  logoUrl: optionalUrl,
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use um hexadecimal como #DB2527"),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  tiktokUrl: optionalUrl,
});

export const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome").max(80).trim(),
  phone: z.string().max(20).optional().or(z.literal("")),
  jobTitle: z.string().max(60).optional().or(z.literal("")),
});

export const userInviteSchema = z.object({
  name: z.string().min(2, "Informe o nome").max(80).trim(),
  email: z
    .string()
    .email("E-mail inválido")
    .transform((value) => value.toLowerCase().trim()),
  role: z.enum(["ADMIN", "MANAGER", "SALESPERSON", "VIEWER"]),
  jobTitle: z.string().max(60).optional().or(z.literal("")),
  commissionRate: z.number().min(0).max(100),
  password: z
    .string()
    .min(8, "Mínimo de 8 caracteres")
    .max(72)
    .regex(/[a-z]/, "Inclua uma letra minúscula")
    .regex(/[A-Z]/, "Inclua uma letra maiúscula")
    .regex(/\d/, "Inclua um número"),
});

export const userUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).max(80).trim(),
  role: z.enum(["ADMIN", "MANAGER", "SALESPERSON", "VIEWER"]),
  jobTitle: z.string().max(60).optional().or(z.literal("")),
  commissionRate: z.number().min(0).max(100),
  isActive: z.boolean(),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type UserInviteInput = z.infer<typeof userInviteSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
