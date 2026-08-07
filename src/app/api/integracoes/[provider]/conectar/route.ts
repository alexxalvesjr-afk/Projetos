import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requirePermission } from "@/lib/session";
import {
  isProviderConfigured,
  OAUTH_STATE_COOKIE,
  providerConfig,
  providerFromSlug,
  redirectUri,
} from "@/lib/ads/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Começa a autorização de uma conta de anúncios.
 *
 * Existe como rota, e não como botão que aponta direto para o Meta, por dois
 * motivos: a permissão é conferida aqui, antes de qualquer redirecionamento, e
 * o `state` anti-CSRF precisa ser gerado no servidor e guardado num cookie
 * httpOnly. Um link montado no navegador não teria como fazer nenhum dos dois.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const user = await requirePermission("campaign:manage");
  const { provider: slug } = await params;

  const provider = providerFromSlug(slug);
  if (!provider) {
    return NextResponse.redirect(new URL("/marketing", request.nextUrl.origin));
  }

  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(
      new URL("/marketing?integracao=sem-chaves", request.nextUrl.origin),
    );
  }

  const config = providerConfig(provider);
  const nonce = randomBytes(24).toString("base64url");

  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, `${provider}:${nonce}:${user.organizationId}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/integracoes",
    // Tempo de sobra para autorizar sem deixar um state válido por horas.
    maxAge: 600,
  });

  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId!);
  url.searchParams.set("redirect_uri", redirectUri(provider));
  url.searchParams.set("state", nonce);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("response_type", "code");

  if (provider === "GOOGLE_ADS") {
    // Sem estes dois o Google devolve refresh token só na primeira autorização
    // de cada usuário — e uma reconexão futura ficaria sem como se renovar.
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  return NextResponse.redirect(url);
}
