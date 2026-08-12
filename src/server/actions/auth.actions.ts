"use server";

import { timingSafeEqual } from "node:crypto";
import { AuthError } from "next-auth";

import { hashPassword, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { ConflictError, ForbiddenError } from "@/lib/errors";
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
 * Distinguishes "the database is not there" from "the password is wrong".
 *
 * Prisma signals an unreachable server with `PrismaClientInitializationError`
 * and error codes in the P1xxx range. Walks the `cause` chain because Auth.js
 * nests the original error one or two levels down.
 */
function isInfrastructureFailure(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; current && depth < 5; depth += 1) {
    const name = (current as { name?: string }).name ?? "";
    const code = (current as { code?: string }).code ?? "";
    const message = (current as { message?: string }).message ?? "";

    if (
      name === "PrismaClientInitializationError" ||
      /^P1\d{3}$/.test(String(code)) ||
      /Can't reach database server|ECONNREFUSED|ENOTFOUND/i.test(message)
    ) {
      return true;
    }

    // Auth.js puts the provider error under `cause.err`, plain errors under `cause`.
    const cause = (current as { cause?: unknown }).cause;
    current =
      cause && typeof cause === "object" && "err" in cause
        ? (cause as { err: unknown }).err
        : cause;
  }

  return false;
}

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
    // Auth.js wraps whatever `authorize` threw in a CallbackRouteError, which
    // is itself an AuthError. Reporting the whole class as "wrong password" is
    // how an unreachable database ends up telling people their correct
    // credentials are wrong — so unwrap it and name the real failure.
    if (isInfrastructureFailure(error)) {
      return actionError(
        "Não foi possível conectar ao banco de dados. Confira a variável DATABASE_URL do ambiente.",
        "INTERNAL",
      );
    }

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
 * Compara o código digitado com o segredo configurado, em tempo constante.
 *
 * É um portão, não uma senha de usuário: o mesmo valor vale para toda
 * revenda nova, e só quem vende o sistema o conhece. Tempo constante porque,
 * sendo comparado a cada tentativa de cadastro, um atacante tem quantas
 * tentativas quiser para medir a resposta.
 */
function validCode(typed: string): boolean {
  const expected = process.env.REGISTER_ACCESS_CODE?.trim();
  // Sem a variável configurada, o cadastro fica fechado por padrão — do
  // contrário, uma instalação nova ficaria aberta ao público até alguém
  // lembrar de configurar isso.
  if (!expected) return false;

  const a = Buffer.from(typed);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sign-up por código. Cria a organização e o seu OWNER atomicamente — um
 * inquilino pela metade, sem administrador, seria irrecuperável.
 *
 * Não é mais autoatendimento público: um estranho que ache esta página não
 * cria conta sozinho. Só quem tem o código — hoje, só quem vende o CRM —
 * consegue dar de alta uma revenda nova.
 */
export const register = createPublicAction({
  input: registerSchema,
  rateLimit: "register",
  async handler({ input }) {
    if (!validCode(input.code)) {
      throw new ForbiddenError("Código de acesso inválido.");
    }

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
