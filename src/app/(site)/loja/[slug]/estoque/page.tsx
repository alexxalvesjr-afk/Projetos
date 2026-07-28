import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchX } from "lucide-react";

import { db } from "@/lib/db";
import { vehicleFilterSchema } from "@/lib/validations/vehicle";
import { vehicleRepository } from "@/server/repositories/vehicle.repository";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { VehicleShowcaseCard } from "@/components/site/vehicle-showcase";
import { StoreFilters } from "@/components/site/store-filters";

export const revalidate = 120;

const PER_PAGE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await db.organization.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: store ? `Estoque — ${store.name}` : "Estoque",
    description: store
      ? `Veja todos os seminovos disponíveis na ${store.name}, com fotos, ficha técnica e preço.`
      : undefined,
    alternates: { canonical: `/loja/${slug}/estoque` },
  };
}

export default async function StoreInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const raw = await searchParams;

  const store = await db.organization.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!store) notFound();

  const parsed = vehicleFilterSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : vehicleFilterSchema.parse({});

  const [result, brands] = await Promise.all([
    vehicleRepository.list(store.id, {
      filters: {
        search: filters.q,
        brands: filters.brand ? [filters.brand] : undefined,
        transmission: filters.transmission ? [filters.transmission] : undefined,
        fuel: filters.fuel ? [filters.fuel] : undefined,
        minPriceCents: filters.minPrice,
        maxPriceCents: filters.maxPrice,
        minYear: filters.minYear,
        maxMileage: filters.maxMileage,
        // The storefront never shows sold, archived or unpublished stock.
        status: ["AVAILABLE", "RESERVED"],
        publishedOnly: true,
      },
      sort: filters.sort,
      page: filters.page,
      perPage: PER_PAGE,
    }),
    vehicleRepository.brands(store.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Estoque disponível
        </h1>
        <p className="text-muted-foreground">
          {result.total} {result.total === 1 ? "veículo" : "veículos"} prontos
          para negociar.
        </p>
      </header>

      <StoreFilters brands={brands} />

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed">
          <EmptyState
            icon={SearchX}
            title="Nenhum veículo encontrado"
            description="Tente ajustar os filtros ou fale com um consultor — podemos buscar o carro que você quer."
            action={
              <Button asChild variant="outline">
                <Link href={`/loja/${slug}/estoque`}>Limpar filtros</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((vehicle, index) => (
              <VehicleShowcaseCard
                key={vehicle.id}
                vehicle={vehicle}
                storeSlug={slug}
                priority={index < 3}
              />
            ))}
          </div>

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
