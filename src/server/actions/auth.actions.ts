"use server";

import { AuthError } from "next-auth";

import { hashPassword, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { ConflictError } from "@/lib/errors";
import {
  actionError,
  actionSuccess,
  createPublicAction,
  type ActionResult,
} from "@/lib/safe-action";
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { slugify } from "@/lib/utils";
import { headers } from "next/headers";

/**
 * Credentials sign-in.
 *
 * Rate limited per IP *and* per email so neither a single host nor a
 * distributed attempt against one account can brute-force a password. The
 * failure message is deliberately identical for "no such user" and "wrong
 * password" to avoid confirming which accounts exist.
 */
export async function login(raw: unknown): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError(
      "Confira os campos destacados.",
      "VALIDATION",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";

  for (const key of [`login:ip:${ip}`, `login:email:${parsed.data.email}`]) {
    const limited = checkRateLimit(key, RATE_LIMITS.auth);
    if (!limited.success) {
      return actionError(
        `Muitas tentativas. Tente novamente em ${limited.retryAfter}s.`,
        "RATE_LIMITED",
      );
    }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError("E-mail ou senha incorretos.", "UNAUTHENTICATED");
    }
    throw error;
  }

  resetRateLimit(`login:email:${parsed.data.email}`);

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, organizationId: true },
  });

  if (user) {
    await recordAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "auth.login",
      entity: "User",
      entityId: user.id,
    });
  }

  return actionSuccess(null);
}

/**
 * Self-service sign-up. Creates the organization and its OWNER atomically —
 * a half-created tenant with no administrator would be unrecoverable.
 */
export const register = createPublicAction({
  input: registerSchema,
  rateLimit: "register",
  async handler({ input }) {
    const existing = await db.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError("Já existe uma conta com este e-mail.");
    }

    // Slugs are public (they appear in storefront URLs), so collisions are
    // resolved with a numeric suffix rather than rejected.
    const base = slugify(input.organizationName) || "revenda";
    let slug = base;
    let suffix = 1;
    while (await db.organization.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${++suffix}`;
    }

    const passwordHash = await hashPassword(input.password);

    const organization = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
          email: input.email,
          websiteSettings: { create: {} },
        },
      });

      await tx.user.create({
        data: {
          organizationId: org.id,
          name: input.name,
          email: input.email,
          passwordHash,
          role: "OWNER",
        },
      });

      return org;
    });

    await recordAudit({
      organizationId: organization.id,
      action: "auth.register",
      entity: "Organization",
      entityId: organization.id,
      after: { name: organization.name, slug: organization.slug },
    });

    // Sign the new owner straight in — asking them to log in again after
    // creating an account is friction with no security benefit.
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });

    return { organizationId: organization.id, slug };
  },
});
