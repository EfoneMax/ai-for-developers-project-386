/** Поле запроса и причина, по которой оно не прошло проверку. */
export interface ValidationIssue {
  field: string;
  message: string;
}

/** Результат разбора запроса: значение или список ошибок полей. */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };
