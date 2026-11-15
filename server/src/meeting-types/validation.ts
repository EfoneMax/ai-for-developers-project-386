import type { ParseResult, ValidationIssue } from "../validation.js";

/** Ограничения полей типа встречи из контракта. */
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const DURATION_MIN = 5;
const DURATION_MAX = 240;

/** Значения пагинации по умолчанию и границы из контракта. */
const PAGE_MIN = 1;
const LIMIT_MIN = 1;
const LIMIT_MAX = 100;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Проверяет тело создания типа встречи и возвращает нормализованные поля.
 * Название обрезается по краям, пустое описание считается отсутствующим.
 */
export function parseCreateMeetingType(body: unknown): ParseResult<{
  name: string;
  description?: string;
  durationMinutes: number;
}> {
  if (!isRecord(body)) {
    return {
      ok: false,
      issues: [{ field: "name", message: "Ожидается объект с полями типа встречи" }],
    };
  }

  const issues: ValidationIssue[] = [];
  const name = parseName(body.name, issues);
  const description = parseDescription(body.description, issues);
  const durationMinutes = parseDuration(body.durationMinutes, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  if (name === undefined || durationMinutes === undefined) {
    return { ok: false, issues: [{ field: "name", message: "Укажите название" }] };
  }

  return {
    ok: true,
    value: {
      name,
      ...(description === undefined ? {} : { description }),
      durationMinutes,
    },
  };
}

/**
 * Проверяет параметры страницы списка типов встреч. Отсутствующие
 * параметры заменяются значениями по умолчанию из контракта.
 */
export function parseListQuery(query: { page?: unknown; limit?: unknown }): ParseResult<{
  page: number;
  limit: number;
}> {
  const issues: ValidationIssue[] = [];
  const page = readInteger({
    value: query.page,
    fallback: DEFAULT_PAGE,
    min: PAGE_MIN,
    max: Number.MAX_SAFE_INTEGER,
    issue: { field: "page", message: "Номер страницы — целое число от 1" },
    issues,
  });
  const limit = readInteger({
    value: query.limit,
    fallback: DEFAULT_LIMIT,
    min: LIMIT_MIN,
    max: LIMIT_MAX,
    issue: { field: "limit", message: `Размер страницы — целое число от 1 до ${LIMIT_MAX}` },
    issues,
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: { page, limit } };
}

function parseName(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== "string") {
    issues.push({ field: "name", message: "Укажите название" });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    issues.push({ field: "name", message: "Укажите название" });
    return undefined;
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    issues.push({ field: "name", message: `Название — не больше ${NAME_MAX_LENGTH} символов` });
    return undefined;
  }

  return trimmed;
}

function parseDescription(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push({ field: "description", message: "Описание должно быть строкой" });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
    issues.push({
      field: "description",
      message: `Описание — не больше ${DESCRIPTION_MAX_LENGTH} символов`,
    });
    return undefined;
  }

  return trimmed.length === 0 ? undefined : trimmed;
}

function parseDuration(value: unknown, issues: ValidationIssue[]): number | undefined {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= DURATION_MIN &&
    value <= DURATION_MAX
  ) {
    return value;
  }

  issues.push({
    field: "durationMinutes",
    message: `Длительность — целое число от ${DURATION_MIN} до ${DURATION_MAX} минут`,
  });
  return undefined;
}

interface IntegerField {
  value: unknown;
  fallback: number;
  min: number;
  max: number;
  issue: ValidationIssue;
  issues: ValidationIssue[];
}

function readInteger({ value, fallback, min, max, issue, issues }: IntegerField): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    issues.push(issue);
    return fallback;
  }

  return parsed;
}
