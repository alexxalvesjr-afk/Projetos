/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/**
 * Creates — or resets the password of — the platform administrator.
 *
 * `db:seed` wipes every organization to rebuild the demo dataset, which makes
 * it useless once there is real data in the database. This script is
 * idempotent and touches nothing but the one account, so it is safe to run
 * against production whenever the admin needs to get back in.
 *
 * Credentials default to the ones agreed for this install; setting
 * ADMIN_EMAIL / ADMIN_PASSWORD keeps a real password out of the repository.
 */
const EMAIL = (process.env.ADMIN_EMAIL ?? "alexxalvesjr@gmail.com")
  .toLowerCase()
  .trim();
const PASSWORD = process.env.ADMIN_PASSWORD ?? "12345678";
const NAME = process.env.ADMIN_NAME ?? "Alex Alves";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // Every user belongs to a tenant. Join the existing store when there is one;
  // an empty database gets a bare organization to hang the account off.
  const organization =
    (await db.organization.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await db.organization.create({
      data: { name: "Mypremium", slug: "mypremium" },
    }));

  const admin = await db.user.upsert({
    where: { email: EMAIL },
    // Deliberately narrow: resetting access must not silently rewrite the
    // person's name or move them to another organization.
    update: { passwordHash, role: "OWNER", isActive: true },
    create: {
      organizationId: organization.id,
      name: NAME,
      email: EMAIL,
      passwordHash,
      role: "OWNER",
      jobTitle: "Administrador",
    },
  });

  console.log("");
  console.log(`✅  Administrador pronto: ${admin.email}`);
  console.log(`    Loja: ${organization.name}`);
  console.log(`    Senha: ${PASSWORD}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌  Falha ao criar o administrador:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
