"use server";

import { revalidatePath } from "next/cache";
import type { LeadStage, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/rbac";
import { createAction } from "@/lib/safe-action";
import { normaliseText } from "@/lib/sanitize";
import { scoreLead, STAGE_LABELS } from "@/lib/domain/lead";
import {
  leadActivitySchema,
  leadAssignSchema,
  leadCreateSchema,
  leadDeleteSchema,
  leadMoveSchema,
  leadTaskSchema,
  leadUpdateSchema,
  taskToggleSchema,
} from "@/lib/validations/lead";
import { leadRepository } from "@/server/repositories/lead.repository";
import type { SessionUser } from "@/lib/session";

function revalidateCrm(leadId?: string) {
  revalidatePath("/crm");
  revalidatePath("/dashboard");
  if (leadId) revalidatePath(`/crm/${leadId}`);
}

/**
 * Salespeople may only touch their own carteira. Anyone with `lead:view_all`
 * (manager and above) may act on any lead in the organization.
 */
async function assertLeadAccess(user: SessionUser, leadId: string) {
  const lead = await db.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { id: true, assignedToId: true, stage: true, name: true },
  });
  if (!lead) throw new NotFoundError("Lead");

  const canSeeAll = hasPermission(user.role, "lead:view_all");
  if (!canSeeAll && lead.assignedToId !== user.id) {
    throw new ForbiddenError("Este lead pertence a outro consultor.");
  }
  return lead;
}

function normaliseLead(input: Record<string, unknown>) {
  return {
    name: normaliseText(String(input.name)),
    email: input.email ? String(input.email).toLowerCase().trim() : null,
    phone: input.phone ? String(input.phone).trim() : null,
    source: input.source as never,
    stage: input.stage as LeadStage,
    temperature: input.temperature as never,
    budgetCents: (input.budgetCents as number | null) ?? null,
    notes: input.notes ? String(input.notes) : null,
    tradeInDescription: input.tradeInDescription
      ? normaliseText(String(input.tradeInDescription))
      : null,
    tradeInValueCents: (input.tradeInValueCents as number | null) ?? null,
    interestVehicleId: (input.interestVehicleId as string) || null,
    assignedToId: (input.assignedToId as string) || null,
    nextFollowUpAt: (input.nextFollowUpAt as Date | null) ?? null,
    lostReason: input.lostReason ? String(input.lostReason) : null,
  };
}

export const createLead = createAction({
  input: leadCreateSchema,
  permission: "lead:create",
  audit: { action: "lead.create", entity: "Lead" },
  async handler({ input, ctx }) {
    const payload = normaliseLead(input);

    // Salespeople always own what they create; managers may hand it off.
    const assignedToId = hasPermission(ctx.user.role, "lead:assign")
      ? (payload.assignedToId ?? ctx.user.id)
      : ctx.user.id;

    const score = scoreLead({
      source: payload.source,
      stage: payload.stage,
      temperature: payload.temperature,
      lastContactAt: null,
      hasInterestVehicle: Boolean(payload.interestVehicleId),
      budgetCents: payload.budgetCents,
    });

    const position = await leadRepository.nextPosition(
      ctx.user.organizationId,
      payload.stage,
    );

    const lead = await db.lead.create({
      data: {
        ...payload,
        assignedToId,
        score,
        position,
        organizationId: ctx.user.organizationId,
        activities: {
          create: {
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            type: "SYSTEM",
            content: "Lead cadastrado manualmente.",
          },
        },
      },
      select: { id: true },
    });

    revalidateCrm(lead.id);
    return lead;
  },
});

export const updateLead = createAction({
  input: leadUpdateSchema,
  permission: "lead:update",
  audit: { action: "lead.update", entity: "Lead" },
  async handler({ input, ctx }) {
    await assertLeadAccess(ctx.user, input.id);
    const payload = normaliseLead(input.data);

    const existing = await db.lead.findUniqueOrThrow({
      where: { id: input.id },
      select: { lastContactAt: true },
    });

    await db.lead.update({
      where: { id: input.id },
      data: {
        ...payload,
        // Reassignment requires the dedicated permission.
        ...(hasPermission(ctx.user.role, "lead:assign")
          ? { assignedToId: payload.assignedToId }
          : {}),
        score: scoreLead({
          source: payload.source,
          stage: payload.stage,
          temperature: payload.temperature,
          lastContactAt: existing.lastContactAt,
          hasInterestVehicle: Boolean(payload.interestVehicleId),
          budgetCents: payload.budgetCents,
        }),
      },
    });

    revalidateCrm(input.id);
    return { id: input.id };
  },
});

/**
 * Kanban drag-and-drop.
 *
 * Moving into WON/LOST stamps the closing timestamp, and every move writes a
 * timeline entry so the card's history explains itself later.
 */
export const moveLead = createAction({
  input: leadMoveSchema,
  permission: "lead:update",
  // Dragging is high-frequency; the default mutation budget is too tight.
  rateLimit: false,
  async handler({ input, ctx }) {
    const lead = await assertLeadAccess(ctx.user, input.id);
    const stageChanged = lead.stage !== input.stage;

    const now = new Date();
    const data: Prisma.LeadUncheckedUpdateInput = {
      stage: input.stage,
      wonAt: input.stage === "WON" ? now : null,
      lostAt: input.stage === "LOST" ? now : null,
      lostReason: input.stage === "LOST" ? (input.lostReason ?? null) : null,
    };

    // Reindex the destination column, scoped to the tenant so a forged id from
    // another organization cannot be reordered into view.
    const reindex = input.orderedIds.map((leadId, index) =>
      db.lead.updateMany({
        where: { id: leadId, organizationId: ctx.user.organizationId },
        data: { position: index },
      }),
    );

    await db.$transaction([
      db.lead.update({ where: { id: input.id }, data }),
      ...reindex,
      ...(stageChanged
        ? [
            db.leadActivity.create({
              data: {
                organizationId: ctx.user.organizationId,
                leadId: input.id,
                userId: ctx.user.id,
                type: "STAGE_CHANGE" as const,
                content: `${STAGE_LABELS[lead.stage]} → ${STAGE_LABELS[input.stage]}`,
                metadata: { from: lead.stage, to: input.stage },
              },
            }),
          ]
        : []),
    ]);

    revalidateCrm(input.id);
    return { id: input.id, stage: input.stage };
  },
});

export const assignLead = createAction({
  input: leadAssignSchema,
  permission: "lead:assign",
  audit: { action: "lead.assign", entity: "Lead" },
  async handler({ input, ctx }) {
    const updated = await db.lead.updateMany({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      data: { assignedToId: input.assignedToId },
    });
    if (updated.count === 0) throw new NotFoundError("Lead");

    if (input.assignedToId) {
      await db.notification.create({
        data: {
          organizationId: ctx.user.organizationId,
          userId: input.assignedToId,
          type: "LEAD_ASSIGNED",
          title: "Novo lead atribuído a você",
          link: `/crm/${input.id}`,
        },
      });
    }

    revalidateCrm(input.id);
    return { id: input.id };
  },
});

export const deleteLead = createAction({
  input: leadDeleteSchema,
  permission: "lead:delete",
  audit: { action: "lead.delete", entity: "Lead" },
  async handler({ input, ctx }) {
    const deleted = await leadRepository.delete(
      ctx.user.organizationId,
      input.id,
    );
    if (!deleted) throw new NotFoundError("Lead");

    revalidateCrm();
    return { id: input.id };
  },
});

/** Logging an interaction also refreshes the contact clock and the score. */
export const addLeadActivity = createAction({
  input: leadActivitySchema,
  permission: "lead:update",
  async handler({ input, ctx }) {
    const lead = await assertLeadAccess(ctx.user, input.leadId);

    const contactTypes = ["CALL", "EMAIL", "WHATSAPP", "MEETING"];
    const isContact = contactTypes.includes(input.type);

    const activity = await db.leadActivity.create({
      data: {
        organizationId: ctx.user.organizationId,
        leadId: input.leadId,
        userId: ctx.user.id,
        type: input.type,
        content: input.content,
      },
      select: { id: true },
    });

    if (isContact) {
      const full = await db.lead.findUniqueOrThrow({
        where: { id: input.leadId },
        select: {
          source: true,
          temperature: true,
          interestVehicleId: true,
          budgetCents: true,
        },
      });

      await db.lead.update({
        where: { id: input.leadId },
        data: {
          lastContactAt: new Date(),
          score: scoreLead({
            source: full.source,
            stage: lead.stage,
            temperature: full.temperature,
            lastContactAt: new Date(),
            hasInterestVehicle: Boolean(full.interestVehicleId),
            budgetCents: full.budgetCents,
          }),
        },
      });
    }

    revalidateCrm(input.leadId);
    return activity;
  },
});

export const createLeadTask = createAction({
  input: leadTaskSchema,
  permission: "lead:update",
  async handler({ input, ctx }) {
    await assertLeadAccess(ctx.user, input.leadId);

    const task = await db.task.create({
      data: {
        organizationId: ctx.user.organizationId,
        leadId: input.leadId,
        title: normaliseText(input.title),
        description: input.description || null,
        priority: input.priority,
        dueAt: input.dueAt ?? null,
        assignedToId: input.assignedToId || ctx.user.id,
      },
      select: { id: true },
    });

    await db.leadActivity.create({
      data: {
        organizationId: ctx.user.organizationId,
        leadId: input.leadId,
        userId: ctx.user.id,
        type: "TASK_CREATED",
        content: input.title,
      },
    });

    revalidateCrm(input.leadId);
    return task;
  },
});

export const toggleTask = createAction({
  input: taskToggleSchema,
  permission: "lead:update",
  rateLimit: false,
  async handler({ input, ctx }) {
    const task = await db.task.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      select: { id: true, leadId: true, title: true },
    });
    if (!task) throw new NotFoundError("Tarefa");

    await db.task.update({
      where: { id: task.id },
      data: { completedAt: input.completed ? new Date() : null },
    });

    if (input.completed && task.leadId) {
      await db.leadActivity.create({
        data: {
          organizationId: ctx.user.organizationId,
          leadId: task.leadId,
          userId: ctx.user.id,
          type: "TASK_COMPLETED",
          content: task.title,
        },
      });
    }

    revalidateCrm(task.leadId ?? undefined);
    return { id: task.id };
  },
});
