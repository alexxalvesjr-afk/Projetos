"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { createAction } from "@/lib/safe-action";
import { normaliseText } from "@/lib/sanitize";
import {
  appointmentDeleteSchema,
  appointmentSchema,
  appointmentStatusSchema,
  appointmentUpdateSchema,
  goalSchema,
  type AppointmentInput,
} from "@/lib/validations/agenda";
import { monthStart } from "@/server/repositories/metrics.repository";

function revalidateAgenda() {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

function normaliseAppointment(input: AppointmentInput) {
  return {
    title: normaliseText(input.title),
    type: input.type,
    status: input.status,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    location: input.location || null,
    notes: input.notes || null,
    leadId: input.leadId || null,
    vehicleId: input.vehicleId || null,
    assignedToId: input.assignedToId || null,
  };
}

export const createAppointment = createAction({
  input: appointmentSchema,
  permission: "appointment:create",
  audit: { action: "appointment.create", entity: "Appointment" },
  async handler({ input, ctx }) {
    const payload = normaliseAppointment(input);

    const appointment = await db.appointment.create({
      data: {
        ...payload,
        organizationId: ctx.user.organizationId,
        assignedToId: payload.assignedToId ?? ctx.user.id,
      },
      select: { id: true, leadId: true },
    });

    // Mirror onto the lead's timeline so the card tells the whole story.
    if (appointment.leadId) {
      await db.leadActivity.create({
        data: {
          organizationId: ctx.user.organizationId,
          leadId: appointment.leadId,
          userId: ctx.user.id,
          type: "APPOINTMENT",
          content: payload.title,
        },
      });
      revalidatePath(`/crm/${appointment.leadId}`);
    }

    revalidateAgenda();
    return { id: appointment.id };
  },
});

export const updateAppointment = createAction({
  input: appointmentUpdateSchema,
  permission: "appointment:update",
  audit: { action: "appointment.update", entity: "Appointment" },
  async handler({ input, ctx }) {
    const result = await db.appointment.updateMany({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      data: normaliseAppointment(input.data),
    });
    if (result.count === 0) throw new NotFoundError("Compromisso");

    revalidateAgenda();
    return { id: input.id };
  },
});

export const updateAppointmentStatus = createAction({
  input: appointmentStatusSchema,
  permission: "appointment:update",
  rateLimit: false,
  async handler({ input, ctx }) {
    const result = await db.appointment.updateMany({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      data: { status: input.status },
    });
    if (result.count === 0) throw new NotFoundError("Compromisso");

    revalidateAgenda();
    return { id: input.id };
  },
});

export const deleteAppointment = createAction({
  input: appointmentDeleteSchema,
  permission: "appointment:delete",
  audit: { action: "appointment.delete", entity: "Appointment" },
  async handler({ input, ctx }) {
    const result = await db.appointment.deleteMany({
      where: { id: input.id, organizationId: ctx.user.organizationId },
    });
    if (result.count === 0) throw new NotFoundError("Compromisso");

    revalidateAgenda();
    return { id: input.id };
  },
});

/**
 * Saving the same month twice updates the existing target rather than
 * duplicating it.
 *
 * This deliberately does not use `upsert`. The unique index is
 * (organizationId, userId, period) and `userId` is null for organisation-level
 * goals — Postgres treats every NULL as distinct in a unique index, so an
 * upsert on that key would never match an existing org goal and would insert a
 * second row every save. Matching explicitly is the only correct read here.
 */
export const upsertGoal = createAction({
  input: goalSchema,
  permission: "goal:manage",
  audit: { action: "goal.upsert", entity: "Goal" },
  async handler({ input, ctx }) {
    const period = monthStart(input.period);
    const userId = input.type === "USER" ? input.userId || null : null;

    const targets = {
      targetRevenueCents: input.targetRevenueCents,
      targetProfitCents: input.targetProfitCents,
      targetUnits: input.targetUnits,
    };

    const existing = await db.goal.findFirst({
      where: { organizationId: ctx.user.organizationId, period, userId },
      select: { id: true },
    });

    const goal = existing
      ? await db.goal.update({
          where: { id: existing.id },
          data: targets,
          select: { id: true },
        })
      : await db.goal.create({
          data: {
            organizationId: ctx.user.organizationId,
            type: input.type,
            userId,
            period,
            ...targets,
          },
          select: { id: true },
        });

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return goal;
  },
});
