"use server";

import { revalidatePath } from "next/cache";

import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { canAssignRole } from "@/lib/rbac";
import { createAction } from "@/lib/safe-action";
import { normaliseText, sanitizeHtml } from "@/lib/sanitize";
import {
  cmsDeleteSchema,
  faqSchema,
  organizationSchema,
  profileSchema,
  serviceSchema,
  testimonialSchema,
  userInviteSchema,
  userUpdateSchema,
  websiteSettingsSchema,
} from "@/lib/validations/settings";

function revalidateSite(slug: string) {
  revalidatePath(`/loja/${slug}`, "layout");
  revalidatePath("/cms");
  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Organization & profile
// ---------------------------------------------------------------------------

export const updateOrganization = createAction({
  input: organizationSchema,
  permission: "settings:update",
  audit: { action: "settings.update", entity: "Organization" },
  async handler({ input, ctx }) {
    await db.organization.update({
      where: { id: ctx.user.organizationId },
      data: {
        name: normaliseText(input.name),
        legalName: input.legalName || null,
        taxId: input.taxId || null,
        email: input.email || null,
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        addressLine: input.addressLine || null,
        city: input.city || null,
        state: input.state ? input.state.toUpperCase() : null,
        postalCode: input.postalCode || null,
        logoUrl: input.logoUrl || null,
        brandColor: input.brandColor,
        instagramUrl: input.instagramUrl || null,
        facebookUrl: input.facebookUrl || null,
        youtubeUrl: input.youtubeUrl || null,
        tiktokUrl: input.tiktokUrl || null,
      },
    });

    revalidateSite(ctx.user.organizationSlug);
    return { id: ctx.user.organizationId };
  },
});

export const updateProfile = createAction({
  input: profileSchema,
  async handler({ input, ctx }) {
    await db.user.update({
      where: { id: ctx.user.id },
      data: {
        name: normaliseText(input.name),
        phone: input.phone || null,
        jobTitle: input.jobTitle || null,
      },
    });

    revalidatePath("/settings/profile");
    revalidatePath("/", "layout");
    return { id: ctx.user.id };
  },
});

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export const inviteUser = createAction({
  input: userInviteSchema,
  permission: "user:create",
  audit: { action: "user.create", entity: "User" },
  async handler({ input, ctx }) {
    // Nobody may create an account more privileged than their own.
    if (!canAssignRole(ctx.user.role, input.role)) {
      throw new ForbiddenError(
        "Você não pode conceder um nível de acesso igual ou superior ao seu.",
      );
    }

    const existing = await db.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) throw new ConflictError("Já existe uma conta com este e-mail.");

    const user = await db.user.create({
      data: {
        organizationId: ctx.user.organizationId,
        name: normaliseText(input.name),
        email: input.email,
        role: input.role,
        jobTitle: input.jobTitle || null,
        commissionRate: input.commissionRate,
        passwordHash: await hashPassword(input.password),
      },
      select: { id: true },
    });

    revalidatePath("/users");
    return user;
  },
});

export const updateUser = createAction({
  input: userUpdateSchema,
  permission: "user:update",
  audit: { action: "user.update", entity: "User" },
  async handler({ input, ctx }) {
    const target = await db.user.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundError("Usuário");

    // Guard both directions: you may not edit a peer/superior, nor promote
    // anyone to a level at or above your own.
    if (target.role === "OWNER" && ctx.user.role !== "OWNER") {
      throw new ForbiddenError("Apenas o proprietário pode editar esta conta.");
    }
    if (!canAssignRole(ctx.user.role, input.role)) {
      throw new ForbiddenError(
        "Você não pode conceder um nível de acesso igual ou superior ao seu.",
      );
    }

    // Locking yourself out is never the intent.
    if (target.id === ctx.user.id && !input.isActive) {
      throw new ConflictError("Você não pode desativar a própria conta.");
    }

    await db.user.update({
      where: { id: target.id },
      data: {
        name: normaliseText(input.name),
        role: input.role,
        jobTitle: input.jobTitle || null,
        commissionRate: input.commissionRate,
        isActive: input.isActive,
      },
    });

    revalidatePath("/users");
    return { id: target.id };
  },
});

// ---------------------------------------------------------------------------
// Website CMS
// ---------------------------------------------------------------------------

export const updateWebsiteSettings = createAction({
  input: websiteSettingsSchema,
  permission: "cms:update",
  audit: { action: "cms.update", entity: "WebsiteSettings" },
  async handler({ input, ctx }) {
    const data = {
      heroHeadline: normaliseText(input.heroHeadline),
      // These columns are non-nullable with defaults; an empty string is the
      // "unset" signal the storefront checks before rendering the section.
      heroSubheadline: input.heroSubheadline ?? "",
      heroImageUrl: input.heroImageUrl || null,
      heroCtaLabel: normaliseText(input.heroCtaLabel),
      aboutTitle: input.aboutTitle ?? "",
      // The about body is rendered as HTML on the storefront, so it is the one
      // field that must pass through the allow-list sanitiser.
      aboutBody: input.aboutBody ? sanitizeHtml(input.aboutBody) : null,
      showTestimonials: input.showTestimonials,
      showServices: input.showServices,
      showFaq: input.showFaq,
      metaTitle: input.metaTitle || null,
      metaDescription: input.metaDescription || null,
      ogImageUrl: input.ogImageUrl || null,
      published: input.published,
    };

    await db.websiteSettings.upsert({
      where: { organizationId: ctx.user.organizationId },
      create: { organizationId: ctx.user.organizationId, ...data },
      update: data,
    });

    revalidateSite(ctx.user.organizationSlug);
    return { id: ctx.user.organizationId };
  },
});

export const upsertTestimonial = createAction({
  input: testimonialSchema,
  permission: "cms:update",
  audit: { action: "cms.update", entity: "Testimonial" },
  async handler({ input, ctx }) {
    const data = {
      authorName: normaliseText(input.authorName),
      authorRole: input.authorRole || null,
      content: normaliseText(input.content),
      rating: input.rating,
      published: input.published,
    };

    const record = input.id
      ? await db.testimonial
          .updateMany({
            where: { id: input.id, organizationId: ctx.user.organizationId },
            data,
          })
          .then(() => ({ id: input.id! }))
      : await db.testimonial.create({
          data: { organizationId: ctx.user.organizationId, ...data },
          select: { id: true },
        });

    revalidateSite(ctx.user.organizationSlug);
    return record;
  },
});

export const upsertFaq = createAction({
  input: faqSchema,
  permission: "cms:update",
  audit: { action: "cms.update", entity: "FaqItem" },
  async handler({ input, ctx }) {
    const data = {
      question: normaliseText(input.question),
      answer: normaliseText(input.answer),
      published: input.published,
    };

    const record = input.id
      ? await db.faqItem
          .updateMany({
            where: { id: input.id, organizationId: ctx.user.organizationId },
            data,
          })
          .then(() => ({ id: input.id! }))
      : await db.faqItem.create({
          data: { organizationId: ctx.user.organizationId, ...data },
          select: { id: true },
        });

    revalidateSite(ctx.user.organizationSlug);
    return record;
  },
});

export const upsertService = createAction({
  input: serviceSchema,
  permission: "cms:update",
  audit: { action: "cms.update", entity: "Service" },
  async handler({ input, ctx }) {
    const data = {
      title: normaliseText(input.title),
      description: normaliseText(input.description),
      icon: input.icon,
      published: input.published,
    };

    const record = input.id
      ? await db.service
          .updateMany({
            where: { id: input.id, organizationId: ctx.user.organizationId },
            data,
          })
          .then(() => ({ id: input.id! }))
      : await db.service.create({
          data: { organizationId: ctx.user.organizationId, ...data },
          select: { id: true },
        });

    revalidateSite(ctx.user.organizationSlug);
    return record;
  },
});

export const deleteCmsItem = createAction({
  input: cmsDeleteSchema,
  permission: "cms:update",
  audit: { action: "cms.update", entity: "CmsItem" },
  async handler({ input, ctx }) {
    const where = {
      id: input.id,
      organizationId: ctx.user.organizationId,
    };

    if (input.entity === "testimonial") {
      await db.testimonial.deleteMany({ where });
    } else if (input.entity === "faq") {
      await db.faqItem.deleteMany({ where });
    } else {
      await db.service.deleteMany({ where });
    }

    revalidateSite(ctx.user.organizationSlug);
    return { id: input.id };
  },
});
