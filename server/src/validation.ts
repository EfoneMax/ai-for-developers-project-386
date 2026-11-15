/** Поле запроса и причина, по которой оно не прошло проверку. */
export interface ValidationIssue {
  field: string;
  message: string;
}

/** Результат разбора запроса: значение или список ошибок полей. */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

/** Общие ограничения полей из контракта. */
export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const DURATION_MIN = 5;
export const DURATION_MAX = 240;
export const EMAIL_MAX_LENGTH = 254;
export const COMMENT_MAX_LENGTH = 1000;

/** Базовая проверка формата email: одна `@`, домен с точкой, без пробелов. */
export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Тело запроса должно быть объектом, а не массивом или примитивом. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface RequiredTextRule {
  field: string;
  requiredMessage: string;
  tooLongMessage: string;
  maxLength: number;
}

/**
 * Разбирает обязательную строку: обрезает по краям, rejects пустую и слишком
 * длинную. Ошибки попадают в общий список, чтобы маршрут вернул все поля сразу.
 */
export function parseRequiredText(
  value: unknown,
  issues: ValidationIssue[],
  rule: RequiredTextRule,
): string | undefined {
  if (typeof value !== "string") {
    issues.push({ field: rule.field, message: rule.requiredMessage });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    issues.push({ field: rule.field, message: rule.requiredMessage });
    return undefined;
  }

  if (trimmed.length > rule.maxLength) {
    issues.push({ field: rule.field, message: rule.tooLongMessage });
    return undefined;
  }

  return trimmed;
}
