import type { AdAccountConnection, AdProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secret-box";
import {
  isProviderConfigured,
  providerConfig,
} from "@/lib/ads/providers";
import {
  exchangeMetaCode,
  fetchMetaMetrics,
  listMetaAccounts,
} from "@/lib/ads/meta";
import {
  exchangeGoogleCode,
  fetchGoogleMetrics,
  listGoogleAccounts,
  refreshGoogleToken,
} from "@/lib/ads/google";
import { AdProviderError, type AdAccount, type AdDailyMetric } from "@/lib/ads/types";

/** Quantos dias de histórico cada sincronização recarrega. */
const SYNC_WINDOW_DAYS = 90;

const CHANNEL_OF: Record<AdProvider, "META_ADS" | "GOOGLE_ADS"> = {
  META_ADS: "META_ADS",
  GOOGLE_ADS: "GOOGLE_ADS",
};

/**
 * O que a tela precisa saber sobre uma conexão.
 *
 * Nenhum token entra aqui. Este objeto atravessa a fronteira servidor→cliente,
 * e um segredo que chega ao navegador está publicado, ainda que ninguém o
 * mostre na tela.
 */
export type AdConnectionView = {
  provider: AdProvider;
  label: string;
  description: string;
  /** Falso quando faltam chaves no ambiente: não adianta oferecer o botão. */
  configured: boolean;
  connected: boolean;
  accountId: string | null;
  accountName: string | null;
  availableAccounts: AdAccount[];
  currency: string | null;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
};

function parseAccounts(value: unknown): AdAccount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const account = item as Record<string, unknown>;
    if (typeof account.id !== "string") return [];
    return [
      {
        id: account.id,
        name: typeof account.name === "string" ? account.name : account.id,
        currency:
          typeof account.currency === "string" ? account.currency : null,
      },
    ];
  });
}

export async function listConnections(
  organizationId: string,
): Promise<AdConnectionView[]> {
  const rows = await db.adAccountConnection.findMany({
    where: { organizationId },
  });

  return (["META_ADS", "GOOGLE_ADS"] as const).map((provider) => {
    const config = providerConfig(provider);
    const row = rows.find((item) => item.provider === provider);
    const accounts = parseAccounts(row?.availableAccounts);

    return {
      provider,
      label: config.label,
      description: config.description,
      configured: isProviderConfigured(provider),
      connected: Boolean(row),
      accountId: row?.externalAccountId ?? null,
      accountName: row?.accountName ?? null,
      availableAccounts: accounts,
      currency:
        accounts.find((account) => account.id === row?.externalAccountId)
          ?.currency ?? null,
      lastSyncedAt: row?.lastSyncedAt ?? null,
      lastSyncError: row?.lastSyncError ?? null,
    };
  });
}

/**
 * Guarda o resultado do OAuth.
 *
 * Quando o login dá acesso a uma única conta de anúncios, ela já fica
 * escolhida — é o caso da maioria das revendas, e poupar essa escolha é a
 * diferença entre conectar em um clique e parar numa tela a mais.
 */
export async function saveConnection(params: {
  organizationId: string;
  userId: string;
  provider: AdProvider;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  accounts: AdAccount[];
}): Promise<void> {
  const chosen = params.accounts.length === 1 ? params.accounts[0] : null;

  const data = {
    accessToken: encryptSecret(params.accessToken),
    refreshToken: params.refreshToken
      ? encryptSecret(params.refreshToken)
      : null,
    expiresAt: params.expiresAt ?? null,
    scope: params.scope ?? null,
    availableAccounts: params.accounts,
    externalAccountId: chosen?.id ?? null,
    accountName: chosen?.name ?? null,
    connectedById: params.userId,
    lastSyncError: null,
  };

  await db.adAccountConnection.upsert({
    where: {
      organizationId_provider: {
        organizationId: params.organizationId,
        provider: params.provider,
      },
    },
    create: {
      organizationId: params.organizationId,
      provider: params.provider,
      ...data,
    },
    // Reconectar troca o token e mantém a conta escolhida quando ela ainda
    // está na lista — reconectar não deveria desfazer uma escolha anterior.
    update: {
      ...data,
      externalAccountId: undefined,
      accountName: undefined,
    },
  });

  // Só depois do update dá para saber se a conta antiga sobreviveu à lista
  // nova; se não sobreviveu, ou se nunca houve escolha, aplica o padrão.
  const current = await db.adAccountConnection.findUnique({
    where: {
      organizationId_provider: {
        organizationId: params.organizationId,
        provider: params.provider,
      },
    },
    select: { externalAccountId: true },
  });

  const stillThere = params.accounts.some(
    (account) => account.id === current?.externalAccountId,
  );

  if (!stillThere) {
    await db.adAccountConnection.update({
      where: {
        organizationId_provider: {
          organizationId: params.organizationId,
          provider: params.provider,
        },
      },
      data: {
        externalAccountId: chosen?.id ?? null,
        accountName: chosen?.name ?? null,
      },
    });
  }
}

export async function disconnect(
  organizationId: string,
  provider: AdProvider,
): Promise<void> {
  await db.adAccountConnection.deleteMany({
    where: { organizationId, provider },
  });
}

export async function chooseAccount(
  organizationId: string,
  provider: AdProvider,
  accountId: string,
): Promise<void> {
  const connection = await db.adAccountConnection.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!connection) throw new AdProviderError("Conta não conectada.");

  const account = parseAccounts(connection.availableAccounts).find(
    (item) => item.id === accountId,
  );
  if (!account) {
    throw new AdProviderError("Essa conta não está entre as autorizadas.");
  }

  await db.adAccountConnection.update({
    where: { id: connection.id },
    data: {
      externalAccountId: account.id,
      accountName: account.name,
      lastSyncError: null,
    },
  });
}

/**
 * Um access token válido para chamar a plataforma.
 *
 * No Google o token dura uma hora e é renovado a cada uso a partir do refresh
 * token; no Meta o token longo é usado direto. Renovar sempre que faltar menos
 * de um minuto evita o caso em que o token vence no meio da sincronização.
 */
async function accessTokenFor(
  connection: AdAccountConnection,
): Promise<string> {
  const stored = decryptSecret(connection.accessToken);

  if (connection.provider === "META_ADS") {
    if (!stored) {
      throw new AdProviderError(
        "A autorização do Meta não pôde ser lida. Conecte a conta novamente.",
      );
    }
    return stored;
  }

  const fresh =
    stored &&
    connection.expiresAt &&
    connection.expiresAt.getTime() - Date.now() > 60_000;
  if (fresh) return stored;

  const refresh = connection.refreshToken
    ? decryptSecret(connection.refreshToken)
    : null;
  if (!refresh) {
    throw new AdProviderError(
      "A autorização do Google expirou. Conecte a conta novamente.",
    );
  }

  const tokens = await refreshGoogleToken(refresh);
  await db.adAccountConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptSecret(tokens.accessToken),
      expiresAt: tokens.expiresAt ?? null,
    },
  });

  return tokens.accessToken;
}

export async function fetchAccounts(
  provider: AdProvider,
  accessToken: string,
): Promise<AdAccount[]> {
  return provider === "META_ADS"
    ? listMetaAccounts(accessToken)
    : listGoogleAccounts(accessToken);
}

export function exchangeCode(provider: AdProvider, code: string) {
  return provider === "META_ADS"
    ? exchangeMetaCode(code)
    : exchangeGoogleCode(code);
}

/**
 * Traz o desempenho da plataforma para dentro do CRM.
 *
 * Grava nas mesmas tabelas que a aba de marketing já lê (Campaign e
 * CampaignMetric), então conectar a conta é o bastante: nenhuma tela nova
 * precisa existir para os números aparecerem.
 *
 * A janela é reprocessada por inteiro a cada sincronização, e não apenas o que
 * mudou desde a última. Meta e Google reatribuem conversões por vários dias
 * depois do clique — quem grava um dia e nunca mais o revisita fica com um
 * número que a plataforma já corrigiu.
 */
export async function syncProvider(
  organizationId: string,
  provider: AdProvider,
): Promise<{ campaigns: number; days: number }> {
  const connection = await db.adAccountConnection.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!connection) throw new AdProviderError("Conta não conectada.");
  if (!connection.externalAccountId) {
    throw new AdProviderError("Escolha a conta de anúncios antes de sincronizar.");
  }

  const to = new Date();
  const from = new Date(to.getTime() - SYNC_WINDOW_DAYS * 86_400_000);

  try {
    const token = await accessTokenFor(connection);
    const rows =
      provider === "META_ADS"
        ? await fetchMetaMetrics(token, connection.externalAccountId, from, to)
        : await fetchGoogleMetrics(
            token,
            connection.externalAccountId,
            from,
            to,
          );

    const campaigns = await persist(organizationId, provider, rows);

    await db.adAccountConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });

    return { campaigns, days: rows.length };
  } catch (error) {
    const message =
      error instanceof AdProviderError
        ? error.message
        : "Não foi possível sincronizar agora.";

    await db.adAccountConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: message },
    });

    throw error instanceof AdProviderError
      ? error
      : new AdProviderError(message);
  }
}

async function persist(
  organizationId: string,
  provider: AdProvider,
  rows: AdDailyMetric[],
): Promise<number> {
  const channel = CHANNEL_OF[provider];

  // Agrupa por campanha para fazer um upsert por campanha, e não por linha.
  const byCampaign = new Map<string, AdDailyMetric[]>();
  for (const row of rows) {
    const list = byCampaign.get(row.campaignExternalId);
    if (list) list.push(row);
    else byCampaign.set(row.campaignExternalId, [row]);
  }

  for (const [externalId, days] of byCampaign) {
    const earliest = days.reduce(
      (min, day) => (day.date < min ? day.date : min),
      days[0].date,
    );

    const campaign = await db.campaign.upsert({
      where: {
        organizationId_channel_externalId: {
          organizationId,
          channel,
          externalId,
        },
      },
      create: {
        organizationId,
        channel,
        externalId,
        name: days[0].campaignName,
        startDate: earliest,
        status: "ACTIVE",
      },
      // O nome muda quando o anunciante renomeia a campanha lá; a data de
      // início e o orçamento são do CRM e não devem ser sobrescritos.
      update: { name: days[0].campaignName },
      select: { id: true },
    });

    for (const day of days) {
      await db.campaignMetric.upsert({
        where: { campaignId_date: { campaignId: campaign.id, date: day.date } },
        create: {
          campaignId: campaign.id,
          date: day.date,
          spendCents: day.spendCents,
          impressions: day.impressions,
          clicks: day.clicks,
          leads: day.leads,
        },
        // Vendas e receita são atribuídas pelo CRM, que sabe o que fechou;
        // a plataforma não tem esse dado e não pode zerá-lo.
        update: {
          spendCents: day.spendCents,
          impressions: day.impressions,
          clicks: day.clicks,
          leads: day.leads,
        },
      });
    }
  }

  return byCampaign.size;
}
