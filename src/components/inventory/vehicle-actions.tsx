"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VehicleStatus } from "@prisma/client";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { VEHICLE_STATUS_LABELS } from "@/lib/domain/vehicle";
import {
  deleteVehicle,
  updateVehicleStatus,
} from "@/server/actions/vehicle.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function VehicleActions({
  vehicleId,
  vehicleSlug,
  organizationSlug,
  status,
  published,
  canUpdate,
  canDelete,
}: {
  vehicleId: string;
  vehicleSlug: string;
  organizationSlug: string;
  status: VehicleStatus;
  published: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function changeStatus(next: string) {
    startTransition(async () => {
      const result = await updateVehicleStatus({
        id: vehicleId,
        status: next as VehicleStatus,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        next === "SOLD"
          ? "Veículo marcado como vendido e removido do site."
          : `Status alterado para ${VEHICLE_STATUS_LABELS[next as VehicleStatus]}.`,
      );
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVehicle({ id: vehicleId });

      if (!result.ok) {
        toast.error(result.error);
        setConfirmOpen(false);
        return;
      }

      toast.success("Veículo removido do estoque.");
      router.push("/inventory");
      router.refresh();
    });
  }

  return (
    <>
      {canUpdate ? (
        <Select value={status} onValueChange={changeStatus} disabled={pending}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {canUpdate ? (
        <Button asChild variant="outline">
          <Link href={`/inventory/${vehicleId}/edit`}>
            <Pencil />
            Editar
          </Link>
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Mais ações">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>

          <DropdownMenuItem asChild disabled={!published || status === "SOLD"}>
            <Link
              href={`/loja/${organizationSlug}/veiculo/${vehicleSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink />
              Ver anúncio no site
            </Link>
          </DropdownMenuItem>

          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                <Trash2 />
                Excluir veículo
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        pending={pending}
        title="Excluir este veículo?"
        description="As fotos e o histórico de interesse serão removidos permanentemente. Veículos com venda registrada não podem ser excluídos."
        confirmLabel="Excluir"
      />
    </>
  );
}
