import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Qual versão do código está no ar.
 *
 * Existe para responder, em dez segundos e sem terminal, a pergunta que
 * antecede qualquer investigação de "o botão não apareceu": o deploy chegou a
 * acontecer? Sem isso, cada dúvida vira uma caça ao painel da Vercel.
 *
 * A rota é aberta, então devolve apenas identificadores: hash e branch. A
 * mensagem do commit fica de fora de propósito — o repositório é privado, e
 * ela descreveria em português o que mudou por dentro do sistema.
 */
export function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return NextResponse.json(
    {
      commit: sha ? sha.slice(0, 7) : "desconhecido",
      commitCompleto: sha,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      ambiente: process.env.VERCEL_ENV ?? "local",
      // Carimbado quando o servidor respondeu, não quando foi construído: útil
      // para saber se a instância está viva, e não só se o código é o certo.
      agora: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
