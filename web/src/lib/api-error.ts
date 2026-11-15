import type { ErrorBody } from "@/client/types.gen";

/** Код ошибки: стабильный код контракта или сбой связи. */
export type ApiErrorCode = ErrorBody["code"] | "NETWORK_ERROR";

/**
 * Ошибка обращения к API. Интерфейс принимает решения по `code`
 * и раскладывает `details` по полям формы.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details: NonNullable<ErrorBody["details"]>;

  constructor(
    code: ApiErrorCode,
    message: string,
    details: NonNullable<ErrorBody["details"]> = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }

  /** Сообщение сервера для конкретного поля, если оно есть. */
  fieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }
}

/** Превращает ответ клиента SDK в ошибку с конвертом API. */
export function toApiError(error: unknown): ApiError {
  const body = extractErrorBody(error);

  if (body === undefined) {
    return new ApiError("NETWORK_ERROR", "Не удалось связаться с сервером");
  }

  return new ApiError(body.code, body.message, body.details ?? []);
}

/**
 * Достаёт данные успешного ответа SDK или бросает конверт ошибки.
 * Один помощник на все запросы: разбор ответа не повторяется в каждом модуле.
 */
export function unwrapData<T>({ data, error }: { data: T | undefined; error: unknown }): T {
  if (data !== undefined) {
    return data;
  }

  throw toApiError(error);
}

/**
 * Достаёт тело ошибки из ответа клиента. Клиент бросает разобранный
 * JSON целиком, поэтому конверт `{ error: {...} }` разворачивается здесь.
 */
function extractErrorBody(error: unknown): ErrorBody | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const envelope = (error as { error?: unknown }).error;
  if (typeof envelope !== "object" || envelope === null) {
    return undefined;
  }

  const { code, message, details } = envelope as Partial<ErrorBody>;
  if (typeof code !== "string" || typeof message !== "string") {
    return undefined;
  }

  return {
    code: code as ErrorBody["code"],
    message,
    ...(Array.isArray(details) ? { details } : {}),
  };
}
