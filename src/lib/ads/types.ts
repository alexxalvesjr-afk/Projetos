import { AppError } from "@/lib/errors";

/** Uma conta de anúncios à qual o login autorizado dá acesso. */
export type AdAccount = {
  /** Identificador no provedor, guardado como veio: "act_123" / "1234567890". */
  id: string;
  name: string;
  /** ISO-4217. O CRM soma em centavos e não converte moeda. */
  currency?: string | null;
};

/** Um dia de uma campanha, já normalizado para o formato do CRM. */
export type AdDailyMetric = {
  campaignExternalId: string;
  campaignName: string;
  /** Meia-noite UTC do dia — a mesma chave que CampaignMetric usa. */
  date: Date;
  spendCents: number;
  impressions: number;
  clicks: number;
  leads: number;
};

export type AdTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
};

/**
 * Falha vinda da plataforma, com uma frase que pode ser mostrada na tela.
 *
 * O corpo de erro do Meta e do Google é JSON técnico em inglês; despejá-lo no
 * painel de um lojista não ajuda ninguém. A mensagem curta vai para a tela, o
 * detalhe para o log.
 *
 * Estende AppError porque `createAction` só repassa a mensagem de um AppError;
 * qualquer outro erro vira "algo deu errado", e "conecte a conta de novo" é
 * exatamente a instrução que não pode se perder no caminho.
 */
export class AdProviderError extends AppError {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super("CONFLICT", message, 502);
    this.name = "AdProviderError";
  }
}
