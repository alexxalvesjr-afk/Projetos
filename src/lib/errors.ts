/**
 * Domain error taxonomy. Actions translate these into structured results, so a
 * thrown `AppError` produces a friendly message while any other throwable is
 * reported generically and logged — internal details never reach the client.
 */

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Sessão expirada. Entre novamente.") {
    super("UNAUTHENTICATED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para esta ação.") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Registro") {
    super("NOT_FOUND", `${entity} não encontrado.`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(
      "RATE_LIMITED",
      `Muitas tentativas. Tente novamente em ${retryAfter}s.`,
      429,
    );
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
