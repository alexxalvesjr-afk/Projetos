import { headers } from "next/headers";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { AppError, RateLimitError, isAppError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { assertPermission, requireUser, type SessionUser } from "@/lib/session";
import type { Permission } from "@/lib/rbac";

/**
 * Discriminated result returned by every server action. Actions never throw
 * across the network boundary — the client always receives a value it can
 * narrow, which keeps form error handling uniform.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?: string;
      /** Keyed by form field, ready to feed into React Hook Form. */
      fieldErrors?: Record<string, string[]>;
    };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(
  error: string,
  code?: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, code, fieldErrors };
}

type ActionContext = {
  user: SessionUser;
};

type ActionConfig<TSchema extends z.ZodTypeAny, TResult> = {
  /** Zod schema validating the raw client input. */
  input?: TSchema;
  /** Capability required to run. Omitted for actions any member may call. */
  permission?: Permission;
  /** Rate-limit preset key; defaults to `mutation`. */
  rateLimit?: keyof typeof RATE_LIMITS | false;
  /**
   * When set, a successful run writes an audit entry. `entityId` receives the
   * action result so the log can point at the row that was created.
   */
  audit?: {
    action: string;
    entity: string;
    entityId?: (result: TResult) => string | null | undefined;
  };
  handler: (args: {
    input: z.infer<TSchema>;
    ctx: ActionContext;
  }) => Promise<TResult>;
};

/**
 * Builds an authenticated server action with a consistent pipeline:
 *
 *   authenticate → authorise → rate-limit → validate → run → audit
 *
 * Centralising this means a new action cannot accidentally skip a step, and
 * every failure mode maps to the same `ActionResult` shape.
 */
export function createAction<TSchema extends z.ZodTypeAny, TResult>(
  config: ActionConfig<TSchema, TResult>,
) {
  return async (rawInput?: unknown): Promise<ActionResult<TResult>> => {
    try {
      const user = await requireUser();

      if (config.permission) {
        await assertPermission(user, config.permission);
      }

      if (config.rateLimit !== false) {
        const preset = RATE_LIMITS[config.rateLimit ?? "mutation"];
        const key = `${config.audit?.action ?? "action"}:${user.id}`;
        const result = checkRateLimit(key, preset);
        if (!result.success) throw new RateLimitError(result.retryAfter);
      }

      let input = rawInput as z.infer<TSchema>;
      if (config.input) {
        const parsed = config.input.safeParse(rawInput);
        if (!parsed.success) {
          return actionError(
            "Confira os campos destacados.",
            "VALIDATION",
            parsed.error.flatten().fieldErrors as Record<string, string[]>,
          );
        }
        input = parsed.data;
      }

      const data = await config.handler({ input, ctx: { user } });

      if (config.audit) {
        await recordAudit({
          organizationId: user.organizationId,
          userId: user.id,
          action: config.audit.action,
          entity: config.audit.entity,
          entityId: config.audit.entityId?.(data) ?? null,
          after: data,
        });
      }

      return actionSuccess(data);
    } catch (error) {
      if (isAppError(error)) {
        return actionError(error.message, error.code);
      }

      // Unknown failures are logged server-side and generalised for the client.
      console.error("[action] unhandled error", error);
      return actionError(
        "Algo deu errado. Tente novamente em instantes.",
        "INTERNAL",
      );
    }
  };
}

/**
 * Wrapper for unauthenticated endpoints (public site forms, registration).
 * Rate limiting keys off the client IP since there is no user to key off.
 */
export function createPublicAction<TSchema extends z.ZodTypeAny, TResult>(config: {
  input: TSchema;
  rateLimit?: keyof typeof RATE_LIMITS;
  handler: (args: { input: z.infer<TSchema>; ip: string }) => Promise<TResult>;
}) {
  return async (rawInput: unknown): Promise<ActionResult<TResult>> => {
    try {
      const h = await headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        "unknown";

      const preset = RATE_LIMITS[config.rateLimit ?? "publicForm"];
      const limited = checkRateLimit(`public:${config.rateLimit}:${ip}`, preset);
      if (!limited.success) throw new RateLimitError(limited.retryAfter);

      const parsed = config.input.safeParse(rawInput);
      if (!parsed.success) {
        return actionError(
          "Confira os campos destacados.",
          "VALIDATION",
          parsed.error.flatten().fieldErrors as Record<string, string[]>,
        );
      }

      return actionSuccess(await config.handler({ input: parsed.data, ip }));
    } catch (error) {
      if (isAppError(error)) return actionError(error.message, error.code);
      console.error("[public-action] unhandled error", error);
      return actionError("Não foi possível enviar. Tente novamente.", "INTERNAL");
    }
  };
}

export { AppError };
