/* eslint-disable no-console */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads `.env` into the process.
 *
 * The Prisma CLI reads `.env` on its own, which makes it easy to assume every
 * script does. Plain `tsx` does not — so without this, a local run reports
 * "DATABASE_URL não está definida" while sitting right next to a `.env` that
 * defines it. Only fills in what the real environment has not already set, so
 * a deploy's variables always win.
 */
function loadDotEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match || line.trimStart().startsWith("#")) continue;

    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2"); // strip matching surrounding quotes
  }
}

/**
 * One command from an empty database to a working login.
 *
 * Getting a fresh deploy running otherwise means knowing to run `db:push`
 * before `db:seed`, and knowing that a failure in the first makes the second
 * fail for a completely unrelated-looking reason. This runs them in order and,
 * on the one error that actually happens in practice — no reachable database —
 * says so plainly instead of surfacing a Prisma stack trace.
 */

function run(label: string, command: string) {
  console.log(`\n▸ ${label}`);
  execSync(command, { stdio: "inherit" });
}

function main() {
  loadDotEnv();
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error(
      [
        "",
        "❌  DATABASE_URL não está definida.",
        "",
        "    Este é um app com banco de dados: sem ele nada funciona — nem o login.",
        "    Crie um PostgreSQL gratuito (neon.com ou supabase.com), copie a URL de",
        "    conexão e defina a variável:",
        "",
        "      • Local     → escreva no arquivo .env",
        "      • Vercel    → Settings › Environment Variables",
        "      • Netlify   → Site configuration › Environment variables",
        "",
        "    Depois rode este comando de novo.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  // Never print the password back to a terminal someone might screenshot.
  const safeUrl = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:••••@");
  console.log(`\n🔌  Banco: ${safeUrl}`);

  try {
    run("Criando as tabelas…", "npx prisma db push --skip-generate");
    run("Carregando a loja de demonstração…", "npx tsx prisma/seed.ts");
  } catch {
    console.error(
      [
        "",
        "❌  Não foi possível preparar o banco.",
        "",
        "    A causa quase sempre é a DATABASE_URL: servidor fora do ar, senha",
        "    trocada, ou falta de `?sslmode=require` no fim da URL (Neon e",
        "    Supabase exigem SSL).",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(
    [
      "",
      "✅  Pronto. Já dá pra entrar:",
      "",
      "      Administrador   alexxalvesjr@gmail.com     12345678",
      "      Proprietária    owner@mypremium.com        Mypremium@2026",
      "      Gerente         gerente@mypremium.com      Mypremium@2026",
      "      Vendedor        thiago@mypremium.com       Mypremium@2026",
      "",
      "    Para mostrar os botões de acesso rápido na tela de login do site",
      "    publicado, defina NEXT_PUBLIC_DEMO_MODE=true no ambiente.",
      "",
    ].join("\n"),
  );
}

main();
