import { z } from "zod";

const optionalId = z.string().cuid().optional().nullable().or(z.literal(""));

export const appointmentSchema = z
  .object({
    title: z.string().min(2, "Informe um título").max(120).trim(),
    type: z.enum([
      "VISIT",
      "TEST_DRIVE",
      "CALL",
      "DELIVERY",
      "MEETING",
      "REMINDER",
      "MAINTENANCE",
    ]),
    status: z
      .enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"])
      .default("SCHEDULED"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    location: z.string().max(160).optional().or(z.literal("")),
    notes: z.string().max(2000).optional().or(z.literal("")),
    leadId: optionalId,
    vehicleId: optionalId,
    assignedToId: optionalId,
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "O término deve ser depois do início",
    path: ["endsAt"],
  });

export const appointmentUpdateSchema = z.object({
  id: z.string().cuid(),
  data: appointmentSchema,
});

export const appointmentStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum([
    "SCHEDULED",
    "CONFIRMED",
    "COMPLETED",
    "CANCELED",
    "NO_SHOW",
  ]),
});

export const appointmentDeleteSchema = z.object({ id: z.string().cuid() });

export const goalSchema = z.object({
  /** Month the goal applies to; normalised to the first day, UTC. */
  period: z.coerce.date(),
  type: z.enum(["ORGANIZATION", "USER"]),
  userId: z.string().cuid().optional().nullable().or(z.literal("")),
  targetRevenueCents: z.number().int().min(0).max(999_999_999),
  targetProfitCents: z.number().int().min(0).max(999_999_999),
  targetUnits: z.number().int().min(0).max(10_000),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
