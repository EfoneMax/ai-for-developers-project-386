import type { ValidationIssue } from "./validation.js";

/** Стабильные коды ошибок API из контракта (ADR-0005). */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "MEETING_TYPE_NOT_FOUND"
  | "SLOT_TAKEN"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_CANCELLABLE"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

/** Ошибка конкретного поля запроса: та же форма, что у разбора тела. */
export type ApiErrorDetail = ValidationIssue;

/** Конверт ошибки API. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

/** Собирает конверт ошибки; пустой список details не попадает в ответ. */
export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      ...(details === undefined || details.length === 0 ? {} : { details }),
    },
  };
}

/** Ошибка валидации полей или параметров запроса. */
export function validationError(details: ApiErrorDetail[]): ApiErrorBody {
  return apiError("VALIDATION_ERROR", "Проверьте заполнение полей", details);
}
