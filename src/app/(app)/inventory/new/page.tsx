import type { Metadata } from "next";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleForm } from "@/components/inventory/vehicle-form";

export const metadata: Metadata = {
  title: "Novo veículo",
  description: "Cadastre um veículo no estoque.",
};

export default async function NewVehiclePage() {
  const user = await requirePermission("vehicle:create");

  const sellers = await db.user.findMany({
    where: {
      organizationId: user.organizationId,
      isActive: true,
      role: { in: ["OWNER", "ADMIN", "MANAGER", "SALESPERSON"] },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estoque"
        title="Novo veículo"
        description="Preencha os dados. O anúncio vai ao ar no site assim que você salvar."
      />

      <VehicleForm sellers={sellers} />
    </div>
  );
}
