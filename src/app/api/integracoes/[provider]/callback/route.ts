import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requirePermission } from "@/lib/session";
import { OAUTH_STATE_COOKIE, providerFromSlug } from "@/lib/ads/providers";
import { AdProviderError } from "@/lib/ads/types";
import {
  exchangeCode,
  fetchAccounts,
  saveConnection,
  syncProvider,
} from "@/server/services/ads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(origin: string, status: string) {
  return NextResponse.redirect(new URL(`/marketing?integracao=${status}`, origin));
}

/** Comparação em tempo constante — o state é um segredo de uso único. */
function sameNonce(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Fecha a autorização: troca o código por token, descobre as contas às quais
 * ele dá acesso e já traz o histórico.
 *
 * Sincronizar aqui, e não só no próximo clique, é o que faz a aba de marketing
 * ter números assim que o lojista volta — conectar e encontrar a tela vazia
 * pareceria que não funcionou.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const origin = request.nextUrl.origin;
  const user = await requirePermission("campaign:manage");
  const { provider: slug } = await params;

  const provider = providerFromSlug(slug);
  if (!provider) return back(origin, "invalida");

  const store = await cookies();
  const cookie = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);

  // O usuário pode ter clicado em "Cancelar" na tela do provedor.
  if (request.nextUrl.searchParams.get("error")) return back(origin, "cancelada");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || !cookie) return back(origin, "invalida");

  // O cookie prende a autorização ao provedor, ao nonce e à loja que a
  // iniciou: sem isso, um link forjado poderia ligar a conta de anúncios de
  // um terceiro à loja de quem clicasse.
  const [cookieProvider, nonce, organizationId] = cookie.split(":");
  if (
    cookieProvider !== provider ||
    !nonce ||
    !sameNonce(nonce, state) ||
    organizationId !== user.organizationId
  ) {
    return back(origin, "invalida");
  }

  try {
    const tokens = await exchangeCode(provider, code);
    const accounts = await fetchAccounts(provider, tokens.accessToken);

    await saveConnection({
      organizationId: user.organizationId,
      userId: user.id,
      provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      accounts,
    });

    if (accounts.length === 0) return back(origin, "sem-contas");
    if (accounts.length > 1) return back(origin, "escolher-conta");

    // Uma conta só: já dá para trazer os números. Uma falha aqui não desfaz a
    // conexão — ela fica gravada com o erro, e o botão "Sincronizar" tenta de
    // novo sem obrigar ninguém a autorizar tudo outra vez.
    await syncProvider(user.organizationId, provider).catch(() => null);
    return back(origin, "conectada");
  } catch (error) {
    console.error(
      "[integracoes] falha ao concluir a conexão:",
      error instanceof AdProviderError ? error.detail ?? error.message : error,
    );
    return back(origin, "falhou");
  }
}
