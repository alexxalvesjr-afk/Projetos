import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Car, Plus, SearchX } from "lucide-react";

import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { formatCurrencyShort } from "@/lib/format";
import { vehicleFilterSchema } from "@/lib/validations/vehicle";
import {
  vehicleRepository,
  type VehicleFilters,
} from "@/server/repositories/vehicle.repository";
import { metricsRepository } from "@/server/repositories/metrics.repository";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import {
  VehicleCard,
  VehicleCardSkeleton,
} from "@/components/inventory/vehicle-card";
import { VehicleTable } from "@/components/inventory/vehicle-table";

export const metadata: Metadata = {
  title: "Estoque",
  description: "Gerencie os veículos da sua revenda.",
};

const PER_PAGE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function InventoryList({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePermission("vehicle:view");
  const raw = await searchParams;

  // Unknown or malformed query params fall back to defaults rather than 500.
  const parsed = vehicleFilterSchema.safeParse(raw);
  const params = parsed.success ? parsed.data : vehicleFilterSchema.parse({});

  const showFinancials = hasPermission(user.role, "vehicle:view_cost");

  const filters: VehicleFilters = {
    search: params.q,
    status: params.status ? [params.status as never] : undefined,
    brands: params.brand ? [params.brand] : undefined,
    transmission: params.transmission ? [params.transmission] : undefined,
    fuel: params.fuel ? [params.fuel] : undefined,
    minPriceCents: params.minPrice,
    maxPriceCents: params.maxPrice,
    minYear: params.minYear,
    maxYear: params.maxYear,
    maxMileage: params.maxMileage,
    withoutMargin: params.margem === "pendente",
  };

  const [result, brands, stock] = await Promise.all([
    vehicleRepository.list(user.organizationId, {
      filters,
      sort: params.sort,
      page: params.page,
      perPage: PER_PAGE,
    }),
    vehicleRepository.brands(user.organizationId),
    metricsRepository.stockSummary(user.organizationId),
  ]);

  const hasFilters = Boolean(
    params.q ||
      params.status ||
      params.brand ||
      params.transmission ||
      params.fuel ||
      params.minYear ||
      params.maxMileage,
  );

  return (
    <div className="space-y-5">
      {/* Stock summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Disponíveis", value: stock.available, accent: "text-success" },
          { label: "Reservados", value: stock.reserved, accent: "text-warning" },
          { label: "Em preparação", value: stock.pending, accent: "text-info" },
          showFinancials
            ? {
                label: "Capital investido",
                value: formatCurrencyShort(stock.investedCents),
                accent: "text-foreground",
              }
            : {
                label: "Total em estoque",
                value: stock.inStock,
                accent: "text-foreground",
              },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="px-4 py-3.5">
              <p className="text-muted-foreground text-xs font-medium">
                {item.label}
              </p>
              <p className={`tabular mt-1 text-xl font-semibold ${item.accent}`}>
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <InventoryFilters brands={brands} />

      {result.items.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            {hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Nenhum veículo encontrado"
                description="Nenhum item corresponde aos filtros aplicados. Tente ampliar a busca."
                action={
                  <Button asChild variant="outline">
                    <Link href="/inventory">Limpar filtros</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Car}
                title="Seu estoque está vazio"
                description="Cadastre o primeiro veículo para publicá-lo no site e começar a receber leads."
                action={
                  hasPermission(user.role, "vehicle:create") ? (
                    <Button asChild>
                      <Link href="/inventory/new">
                        <Plus />
                        Cadastrar veículo
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {params.view === "table" ? (
            <Card className="overflow-hidden p-0">
              <VehicleTable
                vehicles={result.items}
                showFinancials={showFinancials}
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  showFinancials={showFinancials}
                />
              ))}
            </div>
          )}

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            perPage={result.perPage}
          />
        </>
      )}
    </div>
  );
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePermission("vehicle:view");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description="Todos os veículos da loja, com margem e tempo de giro à vista."
      >
        {hasPermission(user.role, "vehicle:create") ? (
          <Button asChild>
            <Link href="/inventory/new">
              <Plus />
              Novo veículo
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[74px] rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-9.5 w-full max-w-2xl" />
            <GridSkeleton />
          </div>
        }
      >
        <InventoryList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
