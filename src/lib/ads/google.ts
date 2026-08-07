import {
  GOOGLE_ADS_API_VERSION,
  providerConfig,
  redirectUri,
} from "@/lib/ads/providers";
import {
  AdProviderError,
  type AdAccount,
  type AdDailyMetric,
  type AdTokens,
} from "@/lib/ads/types";

const ADS_API = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

/**
 * Cliente de leitura da Google Ads API.
 *
 * Duas diferenças em relação ao Meta valem registro. A primeira é o
 * developer-token: o Google recusa qualquer chamada sem ele, e o token é
 * emitido para quem hospeda o CRM, não para a revenda. A segunda é o
 * login-customer-id, necessário quando o acesso vem por uma conta de
 * administrador (MCC) — é assim que a maioria das agências organiza os
 * clientes.
 */
function headers(accessToken: string): Record<string, string> {
  const config = providerConfig("GOOGLE_ADS");
  if (!config.developerToken) {
    throw new AdProviderError(
      "O token de desenvolvedor do Google Ads não está configurado.",
    );
  }

  const result: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": config.developerToken,
    "Content-Type": "application/json",
  };

  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(
    /\D/g,
    "",
  );
  if (loginCustomerId) result["login-customer-id"] = loginCustomerId;

  return result;
}

type GoogleError = {
  error?: { message?: string; status?: string; code?: number };
};

async function ensureOk(response: Response): Promise<unknown> {
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const error = (Array.isArray(body) ? body[0] : body) as GoogleError | null;
    throw new AdProviderError(
      googleMessage(response.status, error?.error?.message),
      JSON.stringify(error?.error ?? { status: response.status }),
    );
  }

  return body;
}

function googleMessage(status: number, message?: string): string {
  if (status === 401) {
    return "A autorização do Google expirou. Conecte a conta novamente.";
  }
  if (status === 403) {
    return "A conta autorizada não tem permissão para ler esta conta do Google Ads.";
  }
  if (status === 429) {
    return "O Google pediu para aguardar um momento antes de tentar de novo.";
  }
  return message
    ? `O Google recusou a consulta: ${message}`
    : "Não foi possível falar com o Google Ads agora.";
}

async function tokenRequest(body: Record<string, string>): Promise<AdTokens> {
  const config = providerConfig("GOOGLE_ADS");
  if (!config.clientId || !config.clientSecret) {
    throw new AdProviderError("As chaves do Google Ads não estão configuradas.");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await ensureOk(response)) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : null,
    scope: payload.scope ?? null,
  };
}

export function exchangeGoogleCode(code: string): Promise<AdTokens> {
  return tokenRequest({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri("GOOGLE_ADS"),
  });
}

/**
 * O access token do Google vale uma hora.
 *
 * Diferente do Meta, não existe token longo: o refresh token é que dura, e
 * cada sincronização começa trocando-o por um access token novo. Por isso o
 * `prompt=consent` na autorização — sem ele o Google devolve refresh token
 * apenas na primeira vez que o usuário autoriza, e uma reconexão ficaria sem.
 */
export function refreshGoogleToken(refreshToken: string): Promise<AdTokens> {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

export async function listGoogleAccounts(
  accessToken: string,
): Promise<AdAccount[]> {
  const response = await fetch(`${ADS_API}/customers:listAccessibleCustomers`, {
    headers: headers(accessToken),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const body = (await ensureOk(response)) as { resourceNames?: string[] };
  const ids = (body.resourceNames ?? []).map((name) => name.split("/")[1]);

  // `listAccessibleCustomers` devolve só os ids. O nome exige uma consulta por
  // conta; sem ele o lojista teria de escolher entre números de dez dígitos.
  return Promise.all(
    ids.map(async (id) => ({
      id,
      name: (await customerName(accessToken, id)) ?? formatCustomerId(id),
      currency: null,
    })),
  );
}

async function customerName(
  accessToken: string,
  customerId: string,
): Promise<string | null> {
  try {
    const rows = await search<{
      customer?: { descriptiveName?: string; currencyCode?: string };
    }>(
      accessToken,
      customerId,
      "SELECT customer.descriptive_name, customer.currency_code FROM customer LIMIT 1",
    );
    return rows[0]?.customer?.descriptiveName ?? null;
  } catch {
    // Um nome que não veio não impede ninguém de escolher a conta pelo id.
    return null;
  }
}

function formatCustomerId(id: string): string {
  return id.length === 10
    ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`
    : id;
}

/** Roda uma consulta GAQL e devolve as linhas já concatenadas. */
async function search<T>(
  accessToken: string,
  customerId: string,
  query: string,
): Promise<T[]> {
  const response = await fetch(
    `${ADS_API}/customers/${customerId.replace(/\D/g, "")}/googleAds:searchStream`,
    {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({ query }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    },
  );

  // searchStream responde com uma lista de blocos, cada um com seus results.
  const body = (await ensureOk(response)) as { results?: T[] }[] | null;
  if (!Array.isArray(body)) return [];
  return body.flatMap((chunk) => chunk.results ?? []);
}

type GoogleCampaignRow = {
  campaign?: { id?: string; name?: string };
  segments?: { date?: string };
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
    conversions?: number;
  };
};

export async function fetchGoogleMetrics(
  accessToken: string,
  customerId: string,
  from: Date,
  to: Date,
): Promise<AdDailyMetric[]> {
  const rows = await search<GoogleCampaignRow>(
    accessToken,
    customerId,
    `SELECT campaign.id, campaign.name, segments.date,
            metrics.cost_micros, metrics.impressions,
            metrics.clicks, metrics.conversions
     FROM campaign
     WHERE segments.date BETWEEN '${isoDay(from)}' AND '${isoDay(to)}'`,
  );

  return rows
    .filter((row) => row.campaign?.id && row.segments?.date)
    .map((row) => ({
      campaignExternalId: row.campaign!.id!,
      campaignName: row.campaign!.name ?? row.campaign!.id!,
      date: new Date(`${row.segments!.date}T00:00:00.000Z`),
      // Micros: um milhão por unidade da moeda, logo dez mil por centavo.
      spendCents: Math.round((Number(row.metrics?.costMicros) || 0) / 10_000),
      impressions: Number(row.metrics?.impressions) || 0,
      clicks: Number(row.metrics?.clicks) || 0,
      // Conversões vêm fracionadas quando o Google atribui parcialmente uma
      // conversão a mais de um clique; para contagem de leads, arredonda.
      leads: Math.round(row.metrics?.conversions ?? 0),
    }));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
