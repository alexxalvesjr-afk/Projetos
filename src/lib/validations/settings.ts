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

export const websiteSettingsSchema = z.object({
  heroHeadline: z.string().min(4, "Escreva um título").max(120).trim(),
  heroSubheadline: z.string().max(240).optional().or(z.literal("")),
  heroImageUrl: optionalUrl,
  heroCtaLabel: z.string().min(2).max(40).trim(),
  aboutTitle: z.string().max(80).optional().or(z.literal("")),
  aboutBody: z.string().max(4000).optional().or(z.literal("")),
  showTestimonials: z.boolean(),
  showServices: z.boolean(),
  showFaq: z.boolean(),
  metaTitle: z.string().max(70, "Máximo de 70 caracteres").optional().or(z.literal("")),
  metaDescription: z
    .string()
    .max(160, "Máximo de 160 caracteres")
    .optional()
    .or(z.literal("")),
  ogImageUrl: optionalUrl,
  published: z.boolean(),
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

export const testimonialSchema = z.object({
  id: z.string().cuid().optional(),
  authorName: z.string().min(2, "Informe o nome").max(80).trim(),
  authorRole: z.string().max(80).optional().or(z.literal("")),
  content: z.string().min(10, "Escreva o depoimento").max(600).trim(),
  rating: z.number().int().min(1).max(5),
  published: z.boolean().default(true),
});

export const faqSchema = z.object({
  id: z.string().cuid().optional(),
  question: z.string().min(5, "Escreva a pergunta").max(200).trim(),
  answer: z.string().min(5, "Escreva a resposta").max(1500).trim(),
  published: z.boolean().default(true),
});

export const serviceSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().min(2, "Informe o título").max(80).trim(),
  description: z.string().min(10, "Descreva o serviço").max(400).trim(),
  icon: z.string().max(40).default("Sparkles"),
  published: z.boolean().default(true),
});

export const cmsDeleteSchema = z.object({
  id: z.string().cuid(),
  entity: z.enum(["testimonial", "faq", "service"]),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type WebsiteSettingsInput = z.infer<typeof websiteSettingsSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type UserInviteInput = z.infer<typeof userInviteSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type TestimonialInput = z.infer<typeof testimonialSchema>;
export type FaqInput = z.infer<typeof faqSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
