import {
  META_API_VERSION,
  providerConfig,
  redirectUri,
} from "@/lib/ads/providers";
import {
  AdProviderError,
  type AdAccount,
  type AdDailyMetric,
  type AdTokens,
} from "@/lib/ads/types";

const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Cliente de leitura da Marketing API do Meta.
 *
 * Só três operações interessam aqui: trocar o código por um token, listar as
 * contas de anúncio do usuário e baixar o desempenho diário por campanha. Nada
 * escreve na conta do anunciante — o escopo pedido é `ads_read`.
 */
async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    // Dados de campanha mudam ao longo do dia; um cache aqui mostraria número
    // velho logo depois de o lojista clicar em "Sincronizar".
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string; type?: string; code?: number } })
    | null;

  if (!response.ok || body?.error) {
    throw new AdProviderError(
      metaMessage(body?.error?.code, body?.error?.message),
      JSON.stringify(body?.error ?? { status: response.status }),
    );
  }

  if (!body) throw new AdProviderError("O Meta devolveu uma resposta vazia.");
  return body;
}

/** Traduz os erros que aparecem na prática; o resto vira uma frase genérica. */
function metaMessage(code?: number, message?: string): string {
  if (code === 190) {
    return "A autorização do Meta expirou. Conecte a conta novamente.";
  }
  if (code === 200 || code === 10) {
    return "A conta autorizada não tem permissão para ler os anúncios.";
  }
  if (code === 4 || code === 17 || code === 613) {
    return "O Meta pediu para aguardar um momento antes de tentar de novo.";
  }
  return message
    ? `O Meta recusou a consulta: ${message}`
    : "Não foi possível falar com o Meta agora.";
}

export async function exchangeMetaCode(code: string): Promise<AdTokens> {
  const config = providerConfig("META_ADS");
  if (!config.clientId || !config.clientSecret) {
    throw new AdProviderError("As chaves do Meta Ads não estão configuradas.");
  }

  const short = await graph<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri("META_ADS"),
      code,
    },
  );

  // O token do fluxo web dura cerca de uma hora. Trocá-lo pelo de longa
  // duração (~60 dias) é o que evita que a sincronização pare sozinha na
  // manhã seguinte.
  const long = await graph<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    {
      grant_type: "fb_exchange_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      fb_exchange_token: short.access_token,
    },
  ).catch(() => null);

  const token = long ?? short;
  return {
    accessToken: token.access_token,
    expiresAt: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : null,
    scope: config.scope,
  };
}

export async function listMetaAccounts(
  accessToken: string,
): Promise<AdAccount[]> {
  const body = await graph<{
    data: { id: string; name?: string; currency?: string }[];
  }>("/me/adaccounts", {
    fields: "id,name,currency",
    limit: "100",
    access_token: accessToken,
  });

  return body.data.map((account) => ({
    id: account.id,
    name: account.name ?? account.id,
    currency: account.currency ?? null,
  }));
}

type MetaInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
};

/**
 * Quantos leads o dia rendeu.
 *
 * O Meta reporta conversões numa lista de pares tipo/valor, e o tipo depende de
 * como o anunciante mede: formulário instantâneo, mensagem no WhatsApp, evento
 * do pixel. Somar tudo que tem "lead" no nome cobre os três sem obrigar cada
 * revenda a configurar de um jeito só; `offsite_conversion.fb_pixel_lead` e
 * `onsite_conversion.lead_grouped` são os dois mais comuns.
 */
function countLeads(actions: MetaInsightRow["actions"]): number {
  if (!actions) return 0;
  return actions
    .filter((action) => action.action_type.includes("lead"))
    .reduce((sum, action) => sum + (Number(action.value) || 0), 0);
}

export async function fetchMetaMetrics(
  accessToken: string,
  accountId: string,
  from: Date,
  to: Date,
): Promise<AdDailyMetric[]> {
  const body = await graph<{ data: MetaInsightRow[] }>(
    `/${accountId}/insights`,
    {
      level: "campaign",
      fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
      time_range: JSON.stringify({ since: isoDay(from), until: isoDay(to) }),
      // Uma linha por dia, que é a granularidade que CampaignMetric guarda.
      time_increment: "1",
      limit: "500",
      access_token: accessToken,
    },
  );

  return body.data
    .filter((row) => row.campaign_id && row.date_start)
    .map((row) => ({
      campaignExternalId: row.campaign_id!,
      campaignName: row.campaign_name ?? row.campaign_id!,
      date: new Date(`${row.date_start}T00:00:00.000Z`),
      // `spend` vem como string decimal na moeda da conta ("123.45").
      spendCents: Math.round((Number(row.spend) || 0) * 100),
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      leads: countLeads(row.actions),
    }));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
