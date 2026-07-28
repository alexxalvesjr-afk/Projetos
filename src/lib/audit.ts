import { headers } from "next/headers";

import { db } from "@/lib/db";
import { redact } from "@/lib/sanitize";

export type AuditPayload = {
  organizationId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

/**
 * Best-effort client fingerprint. Behind a proxy the first entry of
 * `x-forwarded-for` is the real client; `x-real-ip` covers nginx setups.
 */
async function requestFingerprint() {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return {
      ipAddress:
        forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
      userAgent: h.get("user-agent"),
    };
  } catch {
    // `headers()` throws outside a request scope (e.g. during seeding).
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Writes an immutable audit record. Auditing must never break the operation it
 * describes, so every failure is swallowed and logged rather than thrown.
 */
export async function recordAudit(payload: AuditPayload): Promise<void> {
  try {
    const { ipAddress, userAgent } = await requestFingerprint();

    await db.auditLog.create({
      data: {
        organizationId: payload.organizationId,
        userId: payload.userId ?? null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        before: payload.before
          ? (redact(payload.before) as object)
          : undefined,
        after: payload.after ? (redact(payload.after) as object) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record entry", error);
  }
}

/** Human-readable labels for the activity-log screen. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "vehicle.create": "cadastrou o veículo",
  "vehicle.update": "atualizou o veículo",
  "vehicle.delete": "removeu o veículo",
  "vehicle.status": "alterou o status do veículo",
  "lead.create": "criou o lead",
  "lead.update": "atualizou o lead",
  "lead.delete": "removeu o lead",
  "lead.stage": "moveu o lead de etapa",
  "lead.assign": "reatribuiu o lead",
  "sale.create": "registrou a venda",
  "sale.update": "atualizou a venda",
  "sale.delete": "estornou a venda",
  "appointment.create": "agendou o compromisso",
  "appointment.update": "atualizou o compromisso",
  "appointment.delete": "cancelou o compromisso",
  "goal.upsert": "definiu a meta",
  "campaign.create": "criou a campanha",
  "campaign.update": "atualizou a campanha",
  "campaign.delete": "removeu a campanha",
  "user.create": "convidou o usuário",
  "user.update": "atualizou o usuário",
  "user.delete": "desativou o usuário",
  "settings.update": "atualizou as configurações",
  "cms.update": "editou o site",
  "auth.login": "entrou no sistema",
  "auth.register": "criou a conta",
};

export function describeAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(".", " ");
}
