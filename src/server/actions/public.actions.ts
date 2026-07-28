"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { createPublicAction } from "@/lib/safe-action";
import { normaliseText } from "@/lib/sanitize";
import { scoreLead } from "@/lib/domain/lead";
import { publicLeadSchema } from "@/lib/validations/lead";

/**
 * Storefront enquiry form.
 *
 * Unauthenticated and therefore the most exposed surface in the product:
 * IP rate limited, honeypot-guarded, and it only ever *creates* a lead — it
 * cannot read or modify anything. The organization is resolved from the slug
 * in the URL, never from a client-supplied id.
 */
export const submitPublicLead = createPublicAction({
  input: publicLeadSchema,
  rateLimit: "publicForm",
  async handler({ input }) {
    // Bots fill hidden fields. Report success so they learn nothing.
    if (input.website) return { ok: true };

    const organization = await db.organization.findUnique({
      where: { slug: input.organizationSlug },
      select: { id: true, slug: true },
    });
    if (!organization) throw new NotFoundError("Loja");

    // Only accept a vehicle that actually belongs to this storefront.
    const vehicle = input.vehicleId
      ? await db.vehicle.findFirst({
          where: {
            id: input.vehicleId,
            organizationId: organization.id,
            published: true,
          },
          select: { id: true, brand: true, model: true, assignedToId: true },
        })
      : null;

    // Round-robin would need state; assigning to the unit's consultant (or
    // leaving it unassigned for the floor to claim) is predictable and fair.
    const assignedToId = vehicle?.assignedToId ?? null;

    const lead = await db.lead.create({
      data: {
        organizationId: organization.id,
        name: normaliseText(input.name),
        phone: input.phone.trim(),
        email: input.email ? input.email.toLowerCase().trim() : null,
        source: "WEBSITE",
        stage: "NEW",
        temperature: "WARM",
        interestVehicleId: vehicle?.id ?? null,
        assignedToId,
        notes: input.message ? normaliseText(input.message) : null,
        score: scoreLead({
          source: "WEBSITE",
          stage: "NEW",
          temperature: "WARM",
          lastContactAt: null,
          hasInterestVehicle: Boolean(vehicle),
        }),
        activities: {
          create: {
            organizationId: organization.id,
            type: "SYSTEM",
            content: vehicle
              ? `Contato pelo site sobre o ${vehicle.brand} ${vehicle.model}.`
              : "Contato pelo formulário do site.",
          },
        },
      },
      select: { id: true },
    });

    // Wake whoever needs to act on it.
    if (assignedToId) {
      await db.notification.create({
        data: {
          organizationId: organization.id,
          userId: assignedToId,
          type: "LEAD_ASSIGNED",
          title: "Novo lead pelo site",
          body: `${input.name} demonstrou interesse.`,
          link: `/crm/${lead.id}`,
        },
      });
    }

    revalidatePath("/crm");
    revalidatePath("/dashboard");

    return { ok: true };
  },
});

/** Fire-and-forget view counter for storefront vehicle pages. */
export async function registerVehicleView(vehicleId: string) {
  await db.vehicle
    .update({
      where: { id: vehicleId },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => undefined);
}
