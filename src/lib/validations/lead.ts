import { z } from "zod";

const STAGES = [
  "NEW",
  "CONTACTED",
  "VISIT_SCHEDULED",
  "NEGOTIATION",
  "PROPOSAL",
  "WON",
  "LOST",
] as const;

const SOURCES = [
  "WEBSITE",
  "WHATSAPP",
  "PHONE",
  "WALK_IN",
  "INSTAGRAM",
  "FACEBOOK",
  "GOOGLE_ADS",
  "META_ADS",
  "REFERRAL",
  "MARKETPLACE",
  "OTHER",
] as const;

const optionalId = z
  .string()
  .cuid()
  .optional()
  .nullable()
  .or(z.literal(""));

export const leadSchema = z
  .object({
    name: z.string().min(2, "Informe o nome").max(90).trim(),
    email: z
      .string()
      .email("E-mail inválido")
      .optional()
      .or(z.literal(""))
      .nullable(),
    phone: z
      .string()
      .min(8, "Telefone muito curto")
      .max(20)
      .optional()
      .or(z.literal(""))
      .nullable(),

    source: z.enum(SOURCES).default("WEBSITE"),
    stage: z.enum(STAGES).default("NEW"),
    temperature: z.enum(["COLD", "WARM", "HOT"]).default("WARM"),

    budgetCents: z.number().int().min(0).max(999_999_999).optional().nullable(),
    notes: z.string().max(4000).optional().or(z.literal("")).nullable(),

    tradeInDescription: z.string().max(160).optional().or(z.literal("")).nullable(),
    tradeInValueCents: z
      .number()
      .int()
      .min(0)
      .max(999_999_999)
      .optional()
      .nullable(),

    interestVehicleId: optionalId,
    assignedToId: optionalId,
    nextFollowUpAt: z.coerce.date().optional().nullable(),
    lostReason: z.string().max(160).optional().or(z.literal("")).nullable(),
  })
  // A lead with no way to reach them is a dead record.
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: "Informe ao menos um telefone ou e-mail",
    path: ["phone"],
  });

export const leadCreateSchema = leadSchema;

export const leadUpdateSchema = z.object({
  id: z.string().cuid(),
  data: leadSchema,
});

/**
 * Kanban drag. The client sends the destination column's complete order rather
 * than a single index, so the server can reindex it in one transaction. Sending
 * only a position would require fractional ranks or leave siblings stale.
 */
export const leadMoveSchema = z.object({
  id: z.string().cuid(),
  stage: z.enum(STAGES),
  orderedIds: z.array(z.string().cuid()).max(300),
  lostReason: z.string().max(160).optional(),
});

export const leadActivitySchema = z.object({
  leadId: z.string().cuid(),
  type: z.enum([
    "NOTE",
    "CALL",
    "EMAIL",
    "WHATSAPP",
    "MEETING",
    "PROPOSAL_SENT",
  ]),
  content: z.string().min(1, "Escreva alguma coisa").max(2000).trim(),
});

export const leadTaskSchema = z.object({
  leadId: z.string().cuid(),
  title: z.string().min(2, "Descreva a tarefa").max(120).trim(),
  description: z.string().max(1000).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueAt: z.coerce.date().optional().nullable(),
  assignedToId: optionalId,
});

export const taskToggleSchema = z.object({
  id: z.string().cuid(),
  completed: z.boolean(),
});

export const leadDeleteSchema = z.object({ id: z.string().cuid() });

export const leadAssignSchema = z.object({
  id: z.string().cuid(),
  assignedToId: z.string().cuid().nullable(),
});

/** Storefront enquiry — deliberately minimal to keep friction low. */
export const publicLeadSchema = z.object({
  organizationSlug: z.string().min(1).max(80),
  name: z.string().min(2, "Informe seu nome").max(90).trim(),
  phone: z.string().min(8, "Informe um telefone válido").max(20).trim(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
  vehicleId: z.string().cuid().optional().or(z.literal("")),
  /** Honeypot — bots fill hidden fields, humans never see them. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadTaskInput = z.infer<typeof leadTaskSchema>;
export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
