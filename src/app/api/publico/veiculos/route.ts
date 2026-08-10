import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { formatCurrency, formatMileage } from "@/lib/format";
import {
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/domain/vehicle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only inventory feed for a dealership's own website.
 *
 * This CRM serves no storefront of its own: the dealership's public site is
 * built and hosted elsewhere and reads its stock from here. Publishing a
 * vehicle in the CRM is the single action that puts it on that site.
 *
 * Two rules govern what leaves the building. It only ever returns units that
 * are `published` and still on the floor, so a sold car disappears from an
 * external site the moment it is marked sold. And it selects the public fields
 * by name — `costCents`, `minPriceCents` and every margin figure are absent
 * from the query, not filtered out afterwards, because a field that is never
 * read cannot be leaked by a later edit to this file.
 */

const CORS = {
  // Public data — exactly what the dealership already shows to buyers.
  // Restricting the origin would only oblige every dealership to register a
  // domain before their own site could read their own stock.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("loja")?.trim();
  if (!slug) {
    return NextResponse.json(
      {
        erro: "Informe a loja.",
        exemplo: "/api/publico/veiculos?loja=mypremium-motors",
      },
      { status: 400, headers: CORS },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const limited = checkRateLimit(`stock-feed:${ip}`, RATE_LIMITS.export);
  if (!limited.success) {
    return NextResponse.json(
      { erro: "Muitas requisições. Tente novamente em instantes." },
      {
        status: 429,
        headers: { ...CORS, "Retry-After": String(limited.retryAfter ?? 60) },
      },
    );
  }

  const organization = await db.organization.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      phone: true,
      whatsapp: true,
      email: true,
      addressLine: true,
      city: true,
      state: true,
      logoUrl: true,
      websiteSettings: { select: { published: true } },
    },
  });

  // A storefront switched off is invisible here too, or the feed would become
  // a way around the toggle.
  if (!organization || organization.websiteSettings?.published === false) {
    return NextResponse.json(
      { erro: "Loja não encontrada." },
      { status: 404, headers: CORS },
    );
  }

  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limite") ?? 100) || 100,
    200,
  );

  const vehicles = await db.vehicle.findMany({
    where: {
      organization: { slug },
      published: true,
      status: { in: ["AVAILABLE", "RESERVED"] },
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      brand: true,
      model: true,
      version: true,
      year: true,
      modelYear: true,
      mileage: true,
      color: true,
      doors: true,
      armored: true,
      steering: true,
      traction: true,
      horsepower: true,
      seats: true,
      valvesPerCylinder: true,
      fuelTankLiters: true,
      wheelbaseMm: true,
      lengthMm: true,
      widthMm: true,
      heightMm: true,
      engine: true,
      transmission: true,
      fuel: true,
      bodyType: true,
      priceCents: true,
      description: true,
      accessories: true,
      featured: true,
      status: true,
      createdAt: true,
      images: {
        orderBy: { position: "asc" },
        select: { url: true, alt: true, isCover: true },
      },
    },
  });

  return NextResponse.json(
    {
      loja: {
        nome: organization.name,
        slug: organization.slug,
        telefone: organization.phone,
        whatsapp: organization.whatsapp,
        email: organization.email,
        endereco: organization.addressLine,
        cidade: organization.city,
        estado: organization.state,
        logoUrl: organization.logoUrl,
      },
      total: vehicles.length,
      atualizadoEm: new Date().toISOString(),
      veiculos: vehicles.map((vehicle) => ({
        id: vehicle.id,
        slug: vehicle.slug,
        titulo: [vehicle.brand, vehicle.model, vehicle.version]
          .filter(Boolean)
          .join(" "),
        marca: vehicle.brand,
        modelo: vehicle.model,
        versao: vehicle.version,
        ano: vehicle.year,
        anoModelo: vehicle.modelYear,
        km: vehicle.mileage,
        kmFormatado: formatMileage(vehicle.mileage),
        cor: vehicle.color,
        portas: vehicle.doors,
        blindado: vehicle.armored,
        // Ficha técnica. Vem inteira, com null onde o lojista não preencheu,
        // para que o site decida o que imprimir sem ter de adivinhar.
        fichaTecnica: {
          motor: vehicle.engine,
          direcao: vehicle.steering,
          tracao: vehicle.traction,
          potenciaCv: vehicle.horsepower,
          lugares: vehicle.seats,
          valvulasPorCilindro: vehicle.valvesPerCylinder,
          tanqueLitros: vehicle.fuelTankLiters,
          entreEixosMm: vehicle.wheelbaseMm,
          comprimentoMm: vehicle.lengthMm,
          larguraMm: vehicle.widthMm,
          alturaMm: vehicle.heightMm,
        },
        cambio: TRANSMISSION_LABELS[vehicle.transmission],
        combustivel: FUEL_LABELS[vehicle.fuel],
        // bodyType is optional on the model — a unit entered in a hurry may
        // not have one, and null is more honest here than a guessed category.
        carroceria: vehicle.bodyType
          ? BODY_TYPE_LABELS[vehicle.bodyType]
          : null,
        // Cents keeps the caller free to format; the string spares a site that
        // just wants to print it from reimplementing pt-BR currency rules.
        precoCentavos: vehicle.priceCents,
        preco: formatCurrency(vehicle.priceCents),
        reservado: vehicle.status === "RESERVED",
        destaque: vehicle.featured,
        descricao: vehicle.description,
        opcionais: vehicle.accessories,
        fotoCapa:
          vehicle.images.find((image) => image.isCover)?.url ??
          vehicle.images[0]?.url ??
          null,
        fotos: vehicle.images.map((image) => image.url),
        publicadoEm: vehicle.createdAt.toISOString(),
      })),
    },
    {
      headers: {
        ...CORS,
        // A minute of CDN cache absorbs a busy site without letting a newly
        // published car sit invisible for long.
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
