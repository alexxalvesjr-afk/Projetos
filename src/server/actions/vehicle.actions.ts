"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { createAction } from "@/lib/safe-action";
import { normaliseText } from "@/lib/sanitize";
import { triggerExternalSiteRebuild } from "@/lib/external-site";
import { buildVehicleSlug } from "@/lib/domain/vehicle";
import {
  vehicleDeleteSchema,
  vehicleExpenseSchema,
  vehicleSchema,
  vehicleStatusSchema,
  vehicleUpdateSchema,
} from "@/lib/validations/vehicle";
import { vehicleRepository } from "@/server/repositories/vehicle.repository";

/**
 * The storefront and the back office read the same rows, so any mutation has to
 * invalidate both. Centralised here to guarantee a change is never visible in
 * one place but stale in the other.
 */
async function revalidateVehicle(organizationSlug: string, vehicleSlug?: string) {
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath(`/loja/${organizationSlug}`);
  revalidatePath(`/loja/${organizationSlug}/estoque`);
  if (vehicleSlug) {
    revalidatePath(`/loja/${organizationSlug}/veiculo/${vehicleSlug}`);
  }

  // A dealership may also run a site of its own that reads the public feed at
  // build time. `after` runs this once the response is already on its way, so
  // waiting on Netlify never shows up as a slow save.
  after(() => triggerExternalSiteRebuild(`estoque de ${organizationSlug}`));
}

/** Generates a storefront slug that is unique inside the tenant. */
async function uniqueSlug(
  organizationId: string,
  parts: Parameters<typeof buildVehicleSlug>[0],
  exceptId?: string,
): Promise<string> {
  const token = Math.random().toString(36).slice(2, 8);
  let slug = buildVehicleSlug(parts, token);
  let attempt = 0;

  while (await vehicleRepository.slugExists(organizationId, slug, exceptId)) {
    if (++attempt > 5) throw new ConflictError("Não foi possível gerar a URL.");
    slug = buildVehicleSlug(parts, Math.random().toString(36).slice(2, 8));
  }
  return slug;
}

function normalisePayload(input: z.infer<typeof vehicleSchema>) {
  return {
    brand: normaliseText(input.brand),
    model: normaliseText(input.model),
    version: input.version ? normaliseText(input.version) : null,
    year: input.year,
    modelYear: input.modelYear ?? null,
    mileage: input.mileage,
    transmission: input.transmission,
    fuel: input.fuel,
    bodyType: input.bodyType ?? null,
    color: normaliseText(input.color),
    doors: input.doors ?? null,
    engine: input.engine ? normaliseText(input.engine) : null,
    plate: input.plate ? input.plate.replace(/[^A-Z0-9]/g, "") : null,
    vin: input.vin || null,
    description: input.description || null,
    accessories: input.accessories,
    costCents: input.costCents,
    minPriceCents: input.minPriceCents,
    priceCents: input.priceCents,
    status: input.status,
    featured: input.featured,
    published: input.published,
    assignedToId: input.assignedToId || null,
  };
}

export const createVehicle = createAction({
  input: vehicleSchema,
  permission: "vehicle:create",
  audit: { action: "vehicle.create", entity: "Vehicle" },
  async handler({ input, ctx }) {
    const payload = normalisePayload(input);
    const slug = await uniqueSlug(ctx.user.organizationId, payload);

    const vehicle = await db.vehicle.create({
      data: {
        ...payload,
        slug,
        organizationId: ctx.user.organizationId,
        createdById: ctx.user.id,
        purchasedAt: input.purchasedAt ?? new Date(),
        // A vehicle created as SOLD is a historical import, so stamp the date.
        soldAt: input.status === "SOLD" ? new Date() : null,
        images: {
          create: input.images.map((image, index) => ({
            url: image.url,
            fileKey: image.fileKey ?? null,
            alt: image.alt ?? `${payload.brand} ${payload.model}`,
            position: index,
            isCover: index === 0,
          })),
        },
      },
      select: { id: true, slug: true },
    });

    await revalidateVehicle(ctx.user.organizationSlug, vehicle.slug);
    return vehicle;
  },
});

export const updateVehicle = createAction({
  input: vehicleUpdateSchema,
  permission: "vehicle:update",
  audit: { action: "vehicle.update", entity: "Vehicle" },
  async handler({ input, ctx }) {
    const existing = await db.vehicle.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      select: { id: true, slug: true, brand: true, model: true, status: true },
    });
    if (!existing) throw new NotFoundError("Veículo");

    const payload = normalisePayload(input.data);

    // Re-slug only when the identity of the car changed, so existing storefront
    // URLs (and their search rankings) survive routine edits.
    const identityChanged =
      existing.brand !== payload.brand || existing.model !== payload.model;
    const slug = identityChanged
      ? await uniqueSlug(ctx.user.organizationId, payload, existing.id)
      : existing.slug;

    const becameSold =
      payload.status === "SOLD" && existing.status !== "SOLD";

    await db.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id: existing.id },
        data: {
          ...payload,
          slug,
          ...(input.data.purchasedAt
            ? { purchasedAt: input.data.purchasedAt }
            : {}),
          ...(becameSold ? { soldAt: new Date() } : {}),
          ...(payload.status !== "SOLD" ? { soldAt: null } : {}),
        },
      });

      // Images are replaced wholesale — the client sends the desired final
      // order, which keeps reordering and deletion a single atomic write.
      await tx.vehicleImage.deleteMany({ where: { vehicleId: existing.id } });
      if (input.data.images.length > 0) {
        await tx.vehicleImage.createMany({
          data: input.data.images.map((image, index) => ({
            vehicleId: existing.id,
            url: image.url,
            fileKey: image.fileKey ?? null,
            alt: image.alt ?? `${payload.brand} ${payload.model}`,
            position: index,
            isCover: index === 0,
          })),
        });
      }
    });

    await revalidateVehicle(ctx.user.organizationSlug, slug);
    if (slug !== existing.slug) {
      await revalidateVehicle(ctx.user.organizationSlug, existing.slug);
    }

    return { id: existing.id, slug };
  },
});

export const updateVehicleStatus = createAction({
  input: vehicleStatusSchema,
  permission: "vehicle:update",
  audit: { action: "vehicle.status", entity: "Vehicle" },
  async handler({ input, ctx }) {
    const updated = await vehicleRepository.update(
      ctx.user.organizationId,
      input.id,
      {
        status: input.status,
        soldAt: input.status === "SOLD" ? new Date() : null,
      },
    );
    if (!updated) throw new NotFoundError("Veículo");

    await revalidateVehicle(ctx.user.organizationSlug, updated.slug);
    return { id: input.id, status: input.status };
  },
});

export const deleteVehicle = createAction({
  input: vehicleDeleteSchema,
  permission: "vehicle:delete",
  audit: { action: "vehicle.delete", entity: "Vehicle" },
  async handler({ input, ctx }) {
    const existing = await db.vehicle.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      select: { slug: true, sale: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundError("Veículo");

    // Deleting a sold unit would silently erase revenue from every report.
    if (existing.sale) {
      throw new ConflictError(
        "Este veículo possui uma venda registrada. Arquive-o em vez de excluir.",
      );
    }

    await vehicleRepository.delete(ctx.user.organizationId, input.id);
    await revalidateVehicle(ctx.user.organizationSlug, existing.slug);
    return { id: input.id };
  },
});

export const addVehicleExpense = createAction({
  input: vehicleExpenseSchema,
  permission: "vehicle:update",
  audit: { action: "vehicle.update", entity: "VehicleExpense" },
  async handler({ input, ctx }) {
    const vehicle = await db.vehicle.findFirst({
      where: { id: input.vehicleId, organizationId: ctx.user.organizationId },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundError("Veículo");

    const expense = await db.vehicleExpense.create({
      data: {
        organizationId: ctx.user.organizationId,
        vehicleId: input.vehicleId,
        description: normaliseText(input.description),
        category: input.category,
        amountCents: input.amountCents,
        incurredAt: input.incurredAt ?? new Date(),
      },
    });

    revalidatePath(`/inventory/${input.vehicleId}`);
    return { id: expense.id };
  },
});

export const removeVehicleExpense = createAction({
  input: z.object({ id: z.string().cuid(), vehicleId: z.string().cuid() }),
  permission: "vehicle:update",
  async handler({ input, ctx }) {
    await db.vehicleExpense.deleteMany({
      where: { id: input.id, organizationId: ctx.user.organizationId },
    });
    revalidatePath(`/inventory/${input.vehicleId}`);
    return { id: input.id };
  },
});
