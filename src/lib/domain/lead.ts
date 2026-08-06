import type {
  ActivityType,
  LeadSource,
  LeadStage,
  LeadTemperature,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Pipeline definition
// ---------------------------------------------------------------------------

export type StageMeta = {
  id: LeadStage;
  label: string;
  description: string;
  /** Chart/board accent, referencing a design token. */
  color: string;
  /** Terminal stages close the card and stop the follow-up clock. */
  terminal?: "won" | "lost";
};

/**
 * The pipeline is declared once, in order. The Kanban board, the funnel report
 * and the conversion maths all iterate this array, so adding a stage is a
 * one-line change that propagates everywhere.
 */
export const PIPELINE_STAGES: StageMeta[] = [
  {
    id: "NEW",
    label: "Lead novo",
    description: "Ainda não houve contato.",
    color: "var(--chart-6)",
  },
  {
    id: "CONTACTED",
    label: "Em conversa",
    description: "Já falou com a loja, ainda sem visita marcada.",
    color: "var(--chart-2)",
  },
  {
    id: "VISIT_SCHEDULED",
    label: "Visita marcada",
    description: "Cliente confirmou que vem à loja.",
    color: "oklch(0.68 0.17 55)",
  },
  {
    id: "NEGOTIATION",
    label: "Negociando",
    description: "Conversando preço, troca e financiamento.",
    color: "var(--chart-3)",
  },
  {
    id: "PROPOSAL",
    label: "Ligar de volta",
    description: "Proposta na mesa, esperando resposta do cliente.",
    color: "var(--chart-1)",
  },
  {
    id: "WON",
    label: "Vendeu",
    description: "Venda fechada.",
    color: "var(--success)",
    terminal: "won",
  },
  {
    id: "LOST",
    label: "Não comprou",
    description: "Cliente desistiu ou comprou em outro lugar.",
    color: "oklch(0.44 0.02 27)",
    terminal: "lost",
  },
];

export const STAGE_LABELS = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.label]),
) as Record<LeadStage, string>;

export const STAGE_META = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s]),
) as Record<LeadStage, StageMeta>;

/** Stages that still represent live pipeline value. */
export const OPEN_STAGES: LeadStage[] = PIPELINE_STAGES.filter(
  (s) => !s.terminal,
).map((s) => s.id);

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Site",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  WALK_IN: "Loja física",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  REFERRAL: "Indicação",
  MARKETPLACE: "Marketplace",
  OTHER: "Outro",
};

/**
 * How the lead arrived, written as the event rather than the channel name.
 *
 * "Site" is a taxonomy entry; "Entrou no site da loja" is what happened, and
 * on a pipeline card — where the salesperson is deciding how to open the
 * conversation — knowing someone clicked an ad is different information from
 * knowing they walked through the door.
 */
export const LEAD_ORIGIN_PHRASES: Record<LeadSource, string> = {
  WEBSITE: "Entrou no site da loja",
  WHATSAPP: "Chamou no WhatsApp",
  PHONE: "Ligou para a loja",
  WALK_IN: "Apareceu na loja",
  INSTAGRAM: "Veio pelo Instagram",
  FACEBOOK: "Veio pelo Facebook",
  GOOGLE_ADS: "Veio de anúncio no Google",
  META_ADS: "Veio de anúncio no Facebook",
  REFERRAL: "Veio por indicação",
  MARKETPLACE: "Veio de marketplace",
  OTHER: "Origem não informada",
};

export const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  COLD: "Frio",
  WARM: "Morno",
  HOT: "Quente",
};

export const TEMPERATURE_VARIANTS: Record<
  LeadTemperature,
  "info" | "warning" | "destructive"
> = {
  COLD: "info",
  WARM: "warning",
  HOT: "destructive",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  NOTE: "Anotação",
  CALL: "Ligação",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  MEETING: "Reunião",
  STAGE_CHANGE: "Mudança de etapa",
  TASK_CREATED: "Tarefa criada",
  TASK_COMPLETED: "Tarefa concluída",
  APPOINTMENT: "Agendamento",
  PROPOSAL_SENT: "Proposta enviada",
  SYSTEM: "Sistema",
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const SOURCE_WEIGHTS: Record<LeadSource, number> = {
  WALK_IN: 22,
  REFERRAL: 20,
  WHATSAPP: 14,
  PHONE: 14,
  WEBSITE: 10,
  GOOGLE_ADS: 10,
  META_ADS: 8,
  INSTAGRAM: 6,
  FACEBOOK: 6,
  MARKETPLACE: 6,
  OTHER: 2,
};

const STAGE_WEIGHTS: Record<LeadStage, number> = {
  NEW: 0,
  CONTACTED: 8,
  VISIT_SCHEDULED: 18,
  NEGOTIATION: 26,
  PROPOSAL: 32,
  WON: 40,
  LOST: 0,
};

/**
 * Heuristic 0–100 lead score.
 *
 * Blends how the lead arrived, how far it has travelled, how warm the
 * salesperson judged it, and how recently anyone touched it. Recency is
 * subtractive: a promising lead nobody has called in two weeks is not a
 * promising lead.
 */
export function scoreLead(input: {
  source: LeadSource;
  stage: LeadStage;
  temperature: LeadTemperature;
  lastContactAt?: Date | null;
  hasInterestVehicle?: boolean;
  budgetCents?: number | null;
}): number {
  if (input.stage === "LOST") return 0;

  let score = 20;

  score += SOURCE_WEIGHTS[input.source] ?? 0;
  score += STAGE_WEIGHTS[input.stage] ?? 0;
  score += { COLD: 0, WARM: 6, HOT: 14 }[input.temperature];

  // A named vehicle of interest is a strong intent signal.
  if (input.hasInterestVehicle) score += 6;
  if (input.budgetCents && input.budgetCents > 0) score += 4;

  if (input.lastContactAt) {
    const days = Math.floor(
      (Date.now() - input.lastContactAt.getTime()) / 86_400_000,
    );
    if (days > 21) score -= 22;
    else if (days > 14) score -= 15;
    else if (days > 7) score -= 8;
    else if (days <= 2) score += 5;
  } else if (input.stage !== "NEW") {
    // Past the first stage with no logged contact at all.
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreBand(score: number): {
  label: string;
  variant: "success" | "warning" | "destructive" | "secondary";
} {
  if (score >= 75) return { label: "Prioridade alta", variant: "success" };
  if (score >= 50) return { label: "Acompanhar", variant: "warning" };
  if (score >= 25) return { label: "Baixa tração", variant: "destructive" };
  return { label: "Frio", variant: "secondary" };
}

/** Leads with no contact in 7+ days that are still open need chasing. */
export function isStale(lead: {
  stage: LeadStage;
  lastContactAt: Date | null;
  createdAt: Date;
}): boolean {
  if (!OPEN_STAGES.includes(lead.stage)) return false;
  const reference = lead.lastContactAt ?? lead.createdAt;
  return Date.now() - reference.getTime() > 7 * 86_400_000;
}

/** Default follow-up message pre-filled in the WhatsApp deep link. */
export function whatsappTemplate(leadName: string, vehicle?: string | null) {
  const firstName = leadName.split(" ")[0];
  return vehicle
    ? `Olá ${firstName}, tudo bem? Aqui é da equipe de vendas. Vi que você se interessou pelo ${vehicle} — posso te enviar mais detalhes e condições?`
    : `Olá ${firstName}, tudo bem? Aqui é da equipe de vendas. Como posso te ajudar a encontrar o carro ideal?`;
}
