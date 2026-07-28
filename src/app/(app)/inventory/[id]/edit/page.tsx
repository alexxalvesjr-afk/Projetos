import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { vehicleTitle } from "@/lib/domain/vehicle";
import { vehicleRepository } from "@/server/repositories/vehicle.repository";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleForm } from "@/components/inventory/vehicle-form";
import type { VehicleInput } from "@/lib/validations/vehicle";

export const metadata: Metadata = { title: "Editar veículo" };

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("vehicle:update");
  const { id } = await params;

  const [vehicle, sellers] = await Promise.all([
    vehicleRepository.findById(user.organizationId, id),
    db.user.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
        role: { in: ["OWNER", "ADMIN", "MANAGER", "SALESPERSON"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!vehicle) notFound();

  const expensesCents = vehicle.expenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );

  // Map the database row onto the form's input shape.
  const defaults: VehicleInput & { id: string } = {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version ?? "",
    year: vehicle.year,
    modelYear: vehicle.modelYear,
    mileage: vehicle.mileage,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    bodyType: vehicle.bodyType,
    color: vehicle.color,
    doors: vehicle.doors,
    engine: vehicle.engine ?? "",
    plate: vehicle.plate ?? "",
    vin: vehicle.vin ?? "",
    description: vehicle.description ?? "",
    accessories: vehicle.accessories,
    costCents: vehicle.costCents,
    minPriceCents: vehicle.minPriceCents,
    priceCents: vehicle.priceCents,
    status: vehicle.status,
    featured: vehicle.featured,
    published: vehicle.published,
    purchasedAt: vehicle.purchasedAt,
    assignedToId: vehicle.assignedToId ?? "",
    images: vehicle.images.map((image) => ({
      id: image.id,
      url: image.url,
      fileKey: image.fileKey,
      alt: image.alt,
    })),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estoque"
        title={`Editar ${vehicleTitle(vehicle)}`}
        description="As alterações refletem no site imediatamente após salvar."
      />

      <VehicleForm
        vehicle={defaults}
        sellers={sellers}
        expensesCents={expensesCents}
      />
    </div>
  );
}
