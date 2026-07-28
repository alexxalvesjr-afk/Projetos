import type { Metadata } from "next";
import Link from "next/link";
import { SquareArrowOutUpRight } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CmsEditor } from "@/components/cms/cms-editor";

export const metadata: Metadata = {
  title: "Site",
  description: "Edite a home, depoimentos, serviços, FAQ e SEO da sua loja.",
};

export const dynamic = "force-dynamic";

export default async function CmsPage() {
  const user = await requirePermission("cms:view");

  const [settings, testimonials, services, faqs] = await Promise.all([
    db.websiteSettings.findUnique({
      where: { organizationId: user.organizationId },
    }),
    db.testimonial.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { position: "asc" },
    }),
    db.service.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { position: "asc" },
    }),
    db.faqItem.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { position: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site da loja"
        description="O que você publica aqui vai ao ar imediatamente. O estoque é sincronizado automaticamente."
        eyebrow={
          settings?.published === false ? (
            <Badge variant="warning">Site fora do ar</Badge>
          ) : (
            <Badge variant="success">Site publicado</Badge>
          )
        }
      >
        <Button asChild variant="outline">
          <Link
            href={`/loja/${user.organizationSlug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SquareArrowOutUpRight />
            Ver site
          </Link>
        </Button>
      </PageHeader>

      <CmsEditor
        settings={{
          heroHeadline:
            settings?.heroHeadline ?? "Encontre o carro certo, sem complicação.",
          heroSubheadline: settings?.heroSubheadline ?? "",
          heroImageUrl: settings?.heroImageUrl ?? "",
          heroCtaLabel: settings?.heroCtaLabel ?? "Ver estoque",
          aboutTitle: settings?.aboutTitle ?? "Sobre nós",
          aboutBody: settings?.aboutBody ?? "",
          showTestimonials: settings?.showTestimonials ?? true,
          showServices: settings?.showServices ?? true,
          showFaq: settings?.showFaq ?? true,
          metaTitle: settings?.metaTitle ?? "",
          metaDescription: settings?.metaDescription ?? "",
          ogImageUrl: settings?.ogImageUrl ?? "",
          published: settings?.published ?? true,
        }}
        testimonials={testimonials.map((item) => ({
          id: item.id,
          authorName: item.authorName,
          authorRole: item.authorRole ?? "",
          content: item.content,
          rating: item.rating,
          published: item.published,
        }))}
        services={services.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          icon: item.icon,
          published: item.published,
        }))}
        faqs={faqs.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          published: item.published,
        }))}
      />
    </div>
  );
}
