import type { AdProvider } from "@prisma/client";

/**
 * O que o CRM precisa saber sobre cada plataforma de anúncios.
 *
 * As credenciais ficam em variáveis de ambiente porque são por instalação, não
 * por loja: quem hospeda o CRM cria um app no Meta e outro no Google uma vez, e
 * cada revenda apenas autoriza o acesso à própria conta.
 */
export type ProviderConfig = {
  provider: AdProvider;
  label: string;
  /** Frase curta para quem nunca ouviu falar de "conta de anúncios". */
  description: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  /** Só o Google Ads exige — a API recusa qualquer chamada sem ele. */
  developerToken?: string | undefined;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
};

export const AD_PROVIDERS = ["META_ADS", "GOOGLE_ADS"] as const;

/**
 * Cookie que prende a autorização em curso a quem a iniciou.
 *
 * Guarda provedor, nonce e loja. Fica aqui, e não na rota, para que as duas
 * pontas do fluxo — início e retorno — leiam a mesma constante.
 */
export const OAUTH_STATE_COOKIE = "mp_ads_oauth";

/** Fatia da URL usada nas rotas: /api/integracoes/meta/... */
export const PROVIDER_SLUGS: Record<AdProvider, string> = {
  META_ADS: "meta",
  GOOGLE_ADS: "google",
};

export function providerFromSlug(slug: string): AdProvider | null {
  if (slug === "meta") return "META_ADS";
  if (slug === "google") return "GOOGLE_ADS";
  return null;
}

/**
 * A versão da Graph API fica fixa de propósito. O Meta aposenta versões com
 * data marcada, e uma quebra silenciosa num domingo é pior do que um número
 * que alguém precisa revisar de tempos em tempos.
 */
export const META_API_VERSION = "v21.0";
export const GOOGLE_ADS_API_VERSION = "v18";

export function providerConfig(provider: AdProvider): ProviderConfig {
  if (provider === "META_ADS") {
    return {
      provider,
      label: "Meta Ads",
      description: "Anúncios do Facebook e do Instagram.",
      clientId: process.env.META_ADS_CLIENT_ID?.trim() || undefined,
      clientSecret: process.env.META_ADS_CLIENT_SECRET?.trim() || undefined,
      authorizeUrl: `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`,
      tokenUrl: `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`,
      // Somente leitura: o CRM mostra números, nunca cria nem pausa campanha.
      scope: "ads_read",
    };
  }

  return {
    provider,
    label: "Google Ads",
    description: "Anúncios da busca do Google e da rede de display.",
    clientId: process.env.GOOGLE_ADS_CLIENT_ID?.trim() || undefined,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() || undefined,
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || undefined,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/adwords",
  };
}

/** Uma conexão só pode começar se a instalação tiver as chaves da plataforma. */
export function isProviderConfigured(provider: AdProvider): boolean {
  const config = providerConfig(provider);
  if (!config.clientId || !config.clientSecret) return false;
  if (provider === "GOOGLE_ADS" && !config.developerToken) return false;
  return true;
}

/**
 * Endereço de retorno do OAuth.
 *
 * Precisa ser idêntico ao que está cadastrado no painel do Meta e do Google —
 * ambos comparam a string inteira. Por isso sai de NEXT_PUBLIC_APP_URL, e não
 * do host da requisição: um preview da Vercel tem outro domínio e faria o
 * provedor recusar a troca do código por token.
 */
export function redirectUri(provider: AdProvider): string {
  const origin = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");
  return `${origin}/api/integracoes/${PROVIDER_SLUGS[provider]}/callback`;
}
