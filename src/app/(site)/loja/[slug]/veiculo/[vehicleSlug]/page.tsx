import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { db } from "@/lib/db";
import { whatsappLink } from "@/lib/utils";
import { formatCurrency, formatMileage, formatModelYear } from "@/lib/format";
import {
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  vehicleFullTitle,
  vehicleTitle,
} from "@/lib/domain/vehicle";
import { vehicleRepository } from "@/server/repositories/vehicle.repository";
import { registerVehicleView } from "@/server/actions/public.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehicleGallery } from "@/components/inventory/vehicle-gallery";
import { SiteLeadForm } from "@/components/site/lead-form";
import { VehicleShowcaseCard } from "@/components/site/vehicle-showcase";

export const revalidate = 300;

/**
 * Pre-renders published vehicles at build time so the hottest pages ship as
 * static HTML. Anything not pre-rendered is generated on first request and
 * cached from then on.
 *
 * The database is frequently unreachable during a build (CI, a container image
 * built before the database is provisioned, a preview deploy). That must not
 * fail the build: returning an empty list simply defers every page to on-demand
 * rendering, which is correct behaviour rather than a broken deploy.
 */
export async function generateStaticParams() {
  try {
    const vehicles = await db.vehicle.findMany({
      where: { published: true, status: { in: ["AVAILABLE", "RESERVED"] } },
      select: { slug: true, organization: { select: { slug: true } } },
      take: 500,
    });

    return vehicles.map((vehicle) => ({
      slug: vehicle.organization.slug,
      vehicleSlug: vehicle.slug,
    }));
  } catch {
    console.warn(
      "[build] database unreachable during generateStaticParams; vehicle pages will render on demand",
    );
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; vehicleSlug: string }>;
}): Promise<Metadata> {
  const { slug, vehicleSlug } = await params;
  const vehicle = await vehicleRepository.findPublicBySlug(slug, vehicleSlug);
  if (!vehicle) return { title: "Veículo não encontrado" };

  const title = `${vehicleFullTitle(vehicle)} — ${vehicle.organization.name}`;
  const description =
    vehicle.description?.slice(0, 155) ??
    `${vehicleTitle(vehicle)} ${formatModelYear(vehicle.year, vehicle.modelYear)} com ${formatMileage(vehicle.mileage)}. Confira fotos, ficha técnica e condições.`;

  return {
    title,
    description,
    alternates: { canonical: `/loja/${slug}/veiculo/${vehicleSlug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: vehicle.images[0]?.url ? [vehicle.images[0].url] : undefined,
    },
  };
}

export default async function PublicVehiclePage({
  params,
}: {
  params: Promise<{ slug: string; vehicleSlug: string }>;
}) {
  const { slug, vehicleSlug } = await params;

  const vehicle = await vehicleRepository.findPublicBySlug(slug, vehicleSlug);
  // A sold or unpublished unit 404s — this is the "disappears automatically"
  // half of the storefront sync.
  if (!vehicle) notFound();

  // Counting a view must never block or fail the render.
  void registerVehicleView(vehicle.id);

  const related = await db.vehicle.findMany({
    where: {
      organizationId: vehicle.organizationId,
      published: true,
      status: { in: ["AVAILABLE", "RESERVED"] },
      id: { not: vehicle.id },
      OR: [{ brand: vehicle.brand }, { bodyType: vehicle.bodyType }],
    },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
    take: 3,
  });

  const title = vehicleTitle(vehicle);
  const store = vehicle.organization;

  const specs = [
    ["Ano", formatModelYear(vehicle.year, vehicle.modelYear)],
    ["Quilometragem", formatMileage(vehicle.mileage)],
    ["Câmbio", TRANSMISSION_LABELS[vehicle.transmission]],
    ["Combustível", FUEL_LABELS[vehicle.fuel]],
    ["Cor", vehicle.color],
    ["Carroceria", vehicle.bodyType ? BODY_TYPE_LABELS[vehicle.bodyType] : "—"],
    ["Portas", vehicle.doors ? String(vehicle.doors) : "—"],
    ["Motor", vehicle.engine ?? "—"],
  ] as const;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: vehicleFullTitle(vehicle),
    brand: { "@type": "Brand", name: vehicle.brand },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    color: vehicle.color,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileage,
      unitCode: "KMT",
    },
    fuelType: FUEL_LABELS[vehicle.fuel],
    vehicleTransmission: TRANSMISSION_LABELS[vehicle.transmission],
    image: vehicle.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      price: (vehicle.priceCents / 100).toFixed(2),
      priceCurrency: "BRL",
      availability:
        vehicle.status === "AVAILABLE"
          ? "https://schema.org/InStock"
          : "https://schema.org/LimitedAvailability",
      seller: { "@type": "AutoDealer", name: store.name },
    },
  };

  const message = `Olá! Tenho interesse no ${title} ${formatModelYear(vehicle.year, vehicle.modelYear)} anunciado no site.`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 mb-4"
        >
          <Link href={`/loja/${slug}/estoque`}>
            <ArrowLeft />
            Voltar ao estoque
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">
            <VehicleGallery images={vehicle.images} alt={title} />

            <section>
              <h2 className="mb-4 text-lg font-semibold tracking-[-0.02em]">
                Ficha técnica
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {specs.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {vehicle.accessories.length > 0 ? (
              <section>
                <h2 className="mb-4 text-lg font-semibold tracking-[-0.02em]">
                  Opcionais e conforto
                </h2>
                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {vehicle.accessories.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <Check
                        className="text-success size-4 shrink-0"
                        strokeWidth={2.5}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {vehicle.description ? (
              <section>
                <h2 className="mb-3 text-lg font-semibold tracking-[-0.02em]">
                  Sobre este veículo
                </h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {vehicle.description}
                </p>
              </section>
            ) : null}
          </div>

          {/* Sticky purchase rail */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="bg-card space-y-5 rounded-2xl border p-6 shadow-sm">
              <div className="space-y-2">
                {vehicle.status === "RESERVED" ? (
                  <Badge variant="warning">Reservado</Badge>
                ) : (
                  <Badge variant="success">Disponível</Badge>
                )}
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                  {title}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {formatModelYear(vehicle.year, vehicle.modelYear)} ·{" "}
                  {formatMileage(vehicle.mileage)} · {vehicle.color}
                </p>
              </div>

              <div className="border-y py-4">
                <p className="text-muted-foreground text-xs">Valor à vista</p>
                <p className="tabular text-3xl font-semibold tracking-[-0.03em]">
                  {formatCurrency(vehicle.priceCents)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Aceitamos troca e financiamos em até 60 meses.
                </p>
              </div>

              <div className="grid gap-2">
                {store.whatsapp ? (
                  <Button asChild size="lg">
                    <a
                      href={whatsappLink(store.whatsapp, message)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle />
                      Falar no WhatsApp
                    </a>
                  </Button>
                ) : null}

                {store.phone ? (
                  <Button asChild variant="outline" size="lg">
                    <a href={`tel:${store.phone}`}>
                      <Phone />
                      Ligar para a loja
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="text-muted-foreground flex items-start gap-2 rounded-xl border border-dashed p-3 text-xs leading-relaxed">
                <ShieldCheck className="text-success mt-0.5 size-4 shrink-0" />
                Veículo revisado, com laudo cautelar e garantia. Agende uma
                visita sem compromisso.
              </div>

              <div className="border-t pt-5">
                <p className="mb-3 text-sm font-medium">
                  Prefere que a gente entre em contato?
                </p>
                <SiteLeadForm
                  compact
                  organizationSlug={slug}
                  vehicleId={vehicle.id}
                  vehicleName={title}
                />
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-16">
            <h2 className="mb-6 text-xl font-semibold tracking-[-0.02em]">
              Você também pode gostar
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <VehicleShowcaseCard
                  key={item.id}
                  vehicle={item}
                  storeSlug={slug}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
