import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import * as Icons from "lucide-react";
import { ArrowRight, Car, Quote, Sparkles, Star } from "lucide-react";

import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehicleShowcaseCard } from "@/components/site/vehicle-showcase";
import { SiteLeadForm } from "@/components/site/lead-form";

export const revalidate = 300;

/**
 * Resolves a Lucide icon by name from the CMS.
 *
 * The name comes from user input, so it is validated against the module's
 * exports and falls back to a safe default — never rendered as arbitrary JSX.
 */
function resolveIcon(name: string): Icons.LucideIcon {
  const candidate = (Icons as unknown as Record<string, unknown>)[name];
  return typeof candidate === "function"
    ? (candidate as Icons.LucideIcon)
    : Sparkles;
}

async function getStore(slug: string) {
  return db.organization.findUnique({
    where: { slug },
    include: {
      websiteSettings: true,
      testimonials: {
        where: { published: true },
        orderBy: { position: "asc" },
        take: 6,
      },
      services: {
        where: { published: true },
        orderBy: { position: "asc" },
      },
      faqs: {
        where: { published: true },
        orderBy: { position: "asc" },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Loja não encontrada" };

  const settings = store.websiteSettings;
  const title = settings?.metaTitle || `${store.name} — Seminovos selecionados`;
  const description =
    settings?.metaDescription ||
    settings?.heroSubheadline ||
    `Confira o estoque de seminovos da ${store.name}.`;

  return {
    title,
    description,
    alternates: { canonical: `/loja/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/loja/${slug}`,
      images: settings?.ogImageUrl ? [settings.ogImageUrl] : undefined,
    },
  };
}

export default async function StoreHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const settings = store.websiteSettings;

  const [featured, recent, stockCount] = await Promise.all([
    db.vehicle.findMany({
      where: {
        organizationId: store.id,
        published: true,
        featured: true,
        status: { in: ["AVAILABLE", "RESERVED"] },
      },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      take: 3,
    }),
    db.vehicle.findMany({
      where: {
        organizationId: store.id,
        published: true,
        status: { in: ["AVAILABLE", "RESERVED"] },
      },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.vehicle.count({
      where: {
        organizationId: store.id,
        published: true,
        status: { in: ["AVAILABLE", "RESERVED"] },
      },
    }),
  ]);

  // Featured first, then fill up to six without repeating.
  const showcase = [
    ...featured,
    ...recent.filter((v) => !featured.some((f) => f.id === v.id)),
  ].slice(0, 6);

  // Structured data so Google can render the storefront as a business result.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: store.name,
    description: settings?.metaDescription ?? undefined,
    telephone: store.phone ?? undefined,
    email: store.email ?? undefined,
    address: store.addressLine
      ? {
          "@type": "PostalAddress",
          streetAddress: store.addressLine,
          addressLocality: store.city ?? undefined,
          addressRegion: store.state ?? undefined,
          postalCode: store.postalCode ?? undefined,
          addressCountry: store.country,
        }
      : undefined,
    sameAs: [
      store.instagramUrl,
      store.facebookUrl,
      store.youtubeUrl,
      store.tiktokUrl,
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised server-side from our own data; no user HTML reaches it.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b">
        {settings?.heroImageUrl ? (
          <>
            <Image
              src={settings.heroImageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
          </>
        ) : (
          <div aria-hidden className="grid-backdrop absolute inset-0 opacity-50" />
        )}

        <div
          className={`relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:py-32 ${
            settings?.heroImageUrl ? "text-white" : ""
          }`}
        >
          <div className="max-w-2xl space-y-6">
            <Badge
              variant={settings?.heroImageUrl ? "secondary" : "default"}
              className="backdrop-blur-sm"
            >
              <Car className="size-3" />
              {stockCount} {stockCount === 1 ? "veículo" : "veículos"} disponíveis
            </Badge>

            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
              {settings?.heroHeadline ?? "Encontre o carro certo, sem complicação."}
            </h1>

            {settings?.heroSubheadline ? (
              <p
                className={`max-w-xl text-lg leading-relaxed text-pretty ${
                  settings.heroImageUrl ? "text-white/85" : "text-muted-foreground"
                }`}
              >
                {settings.heroSubheadline}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href={`/loja/${slug}/estoque`}>
                  {settings?.heroCtaLabel ?? "Ver estoque"}
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant={settings?.heroImageUrl ? "secondary" : "outline"}
              >
                <Link href="#contato-form">Falar com um consultor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services --------------------------------------------------------- */}
      {settings?.showServices !== false && store.services.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {store.services.map((service) => {
              const Icon = resolveIcon(service.icon);
              return (
                <div key={service.id} className="space-y-3">
                  <div
                    className="flex size-11 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${store.brandColor} 14%, transparent)`,
                      color: store.brandColor,
                    }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold tracking-[-0.01em]">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Showcase --------------------------------------------------------- */}
      <section className="bg-sidebar border-y">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Destaques do estoque
              </h2>
              <p className="text-muted-foreground">
                Selecionados, revisados e prontos para rodar.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/loja/${slug}/estoque`}>
                Ver todos
                <ArrowRight />
              </Link>
            </Button>
          </div>

          {showcase.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center">
              <p className="text-muted-foreground">
                Estamos renovando o estoque. Volte em breve!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((vehicle, index) => (
                <VehicleShowcaseCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  storeSlug={slug}
                  priority={index < 3}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About ------------------------------------------------------------ */}
      {settings?.aboutBody ? (
        <section id="sobre" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="mb-5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            {settings.aboutTitle || "Sobre nós"}
          </h2>
          <div
            className="text-muted-foreground space-y-4 leading-relaxed [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_strong]:font-medium"
            // Sanitised through the allow-list on save, so only safe tags remain.
            dangerouslySetInnerHTML={{ __html: settings.aboutBody }}
          />
        </section>
      ) : null}

      {/* Testimonials ----------------------------------------------------- */}
      {settings?.showTestimonials !== false && store.testimonials.length > 0 ? (
        <section className="bg-sidebar border-y">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
            <h2 className="mb-8 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Quem comprou, recomenda
            </h2>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {store.testimonials.map((testimonial) => (
                <figure
                  key={testimonial.id}
                  className="bg-card space-y-4 rounded-2xl border p-6 shadow-sm"
                >
                  <Quote
                    className="size-5"
                    style={{ color: store.brandColor }}
                  />
                  <blockquote className="text-sm leading-relaxed">
                    {testimonial.content}
                  </blockquote>
                  <figcaption className="flex items-center justify-between gap-3 border-t pt-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {testimonial.authorName}
                      </p>
                      {testimonial.authorRole ? (
                        <p className="text-muted-foreground truncate text-xs">
                          {testimonial.authorRole}
                        </p>
                      ) : null}
                    </div>
                    <div
                      className="flex shrink-0 gap-0.5"
                      aria-label={`${testimonial.rating} de 5 estrelas`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < testimonial.rating
                              ? "size-3.5 fill-[oklch(0.8_0.15_85)] text-[oklch(0.8_0.15_85)]"
                              : "text-muted-foreground/30 size-3.5"
                          }
                        />
                      ))}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ + contact ---------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          {settings?.showFaq !== false && store.faqs.length > 0 ? (
            <div>
              <h2 className="mb-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Perguntas frequentes
              </h2>
              <div className="space-y-3">
                {store.faqs.map((faq) => (
                  <details
                    key={faq.id}
                    className="group bg-card rounded-xl border p-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                      {faq.question}
                      <span className="text-muted-foreground shrink-0 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ) : null}

          <div id="contato-form">
            <h2 className="mb-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Fale com a gente
            </h2>
            <p className="text-muted-foreground mb-6">
              Responderemos pelo WhatsApp em poucos minutos.
            </p>
            <div className="bg-card rounded-2xl border p-6 shadow-sm">
              <SiteLeadForm organizationSlug={slug} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
