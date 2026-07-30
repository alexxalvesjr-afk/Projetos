import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { runSeed } from "../../../../prisma/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time database setup, reachable from a browser — no terminal, no direct
 * network access to the database required from whoever is standing this app
 * up. `prisma db push` in the build command already gives a fresh deploy its
 * tables; this is the other half, loading data into them.
 *
 * Guarded three ways: closed by default if SETUP_TOKEN is not set in the
 * environment, a token match required otherwise, and a refusal to reseed over
 * existing data unless `force=true` is passed alongside it — reseeding wipes
 * every organization, the same as `npm run db:seed` does locally.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "SETUP_TOKEN não está configurada neste ambiente." },
      { status: 503 },
    );
  }

  const token = request.nextUrl.searchParams.get("token");
  if (token !== expected) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("force") === "true";
  const existing = await db.organization.count();
  if (existing > 0 && !force) {
    return NextResponse.json(
      {
        error: "O banco já tem dados — nada foi alterado.",
        organizations: existing,
        hint: "Adicione &force=true ao link para apagar tudo e recarregar a demonstração. Isso não pode ser desfeito.",
      },
      { status: 409 },
    );
  }

  try {
    const result = await runSeed();
    return NextResponse.json({ ok: true, message: "Banco preparado com sucesso.", ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao preparar o banco.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
