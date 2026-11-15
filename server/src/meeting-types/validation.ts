import type { MeetingTypeListParams, MeetingTypeSortField, SortOrder } from "./store.js";
import {
  DESCRIPTION_MAX_LENGTH,
  DURATION_MAX,
  DURATION_MIN,
  NAME_MAX_LENGTH,
  isRecord,
  parseRequiredText,
  type ParseResult,
  type ValidationIssue,
} from "../validation.js";

/** Значения пагинации по умолчанию и границы из контракта. */
const PAGE_MIN = 1;
const LIMIT_MIN = 1;
const LIMIT_MAX = 100;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_SORT: MeetingTypeSortField = "createdAt";
const DEFAULT_ORDER: SortOrder = "asc";

const SORT_FIELDS: readonly MeetingTypeSortField[] = ["createdAt", "name", "durationMinutes"];
const SORT_ORDERS: readonly SortOrder[] = ["asc", "desc"];

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

  return {
    ok: true,
    value: {
      name: name!,
      ...(description === undefined ? {} : { description }),
      durationMinutes: durationMinutes!,
    },
  };
}

/**
 * Проверяет тело частичного изменения типа встречи. Клиент передаёт
 * непустое подмножество `name`, `description` и `durationMinutes` с теми же
 * правилами, что при создании; `id` и `createdAt` неизменяемы.
 */
export function parseUpdateMeetingType(body: unknown): ParseResult<{
  name?: string;
  description?: string | null;
  durationMinutes?: number;
}> {
  if (!isRecord(body)) {
    return {
      ok: false,
      issues: [{ field: "body", message: "Ожидается объект с полями типа встречи" }],
    };
  }

  const issues: ValidationIssue[] = [];

  if ("id" in body) {
    issues.push({ field: "id", message: "Идентификатор назначает сервер, менять его нельзя" });
  }

  if ("createdAt" in body) {
    issues.push({
      field: "createdAt",
      message: "Время создания назначает сервер, менять его нельзя",
    });
  }

  const name = body.name === undefined ? undefined : parseName(body.name, issues);
  const description = parseDescriptionUpdate(body, issues);
  const durationMinutes =
    body.durationMinutes === undefined ? undefined : parseDuration(body.durationMinutes, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  if (name === undefined && description === undefined && durationMinutes === undefined) {
    return {
      ok: false,
      issues: [
        {
          field: "body",
          message: "Передайте хотя бы одно поле: name, description или durationMinutes",
        },
      ],
    };
  }

  return {
    ok: true,
    value: {
      ...(name === undefined ? {} : { name }),
      ...(description === undefined ? {} : { description }),
      ...(durationMinutes === undefined ? {} : { durationMinutes }),
    },
  };
}

function parseDescriptionUpdate(
  body: Record<string, unknown>,
  issues: ValidationIssue[],
): string | null | undefined {
  if (body.description === undefined) {
    return undefined;
  }

  if (typeof body.description !== "string") {
    issues.push({ field: "description", message: "Описание должно быть строкой" });
    return undefined;
  }

  const trimmed = body.description.trim();
  if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
    issues.push({
      field: "description",
      message: `Описание — не больше ${DESCRIPTION_MAX_LENGTH} символов`,
    });
    return undefined;
  }

  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Проверяет параметры страницы списка типов встреч. Отсутствующие
 * параметры заменяются значениями по умолчанию из контракта.
 */
export function parseListQuery(query: Record<string, unknown>): ParseResult<MeetingTypeListParams> {
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
  const sort = readEnum({
    value: query.sort,
    fallback: DEFAULT_SORT,
    allowed: SORT_FIELDS,
    issue: { field: "sort", message: "Сортировка — createdAt, name или durationMinutes" },
    issues,
  });
  const order = readEnum({
    value: query.order,
    fallback: DEFAULT_ORDER,
    allowed: SORT_ORDERS,
    issue: { field: "order", message: "Порядок — asc или desc" },
    issues,
  });
  const search = readSearch(query.search, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      page,
      limit,
      sort,
      order,
      ...(search === undefined ? {} : { search }),
    },
  };
}

function readSearch(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push({ field: "search", message: "Поиск — одна строка" });
    return undefined;
  }

  return value === "" ? undefined : value;
}

function readEnum<T extends string>({
  value,
  fallback,
  allowed,
  issue,
  issues,
}: {
  value: unknown;
  fallback: T;
  allowed: readonly T[];
  issue: ValidationIssue;
  issues: ValidationIssue[];
}): T {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || !allowed.includes(value as T)) {
    issues.push(issue);
    return fallback;
  }

  return value as T;
}

function parseName(value: unknown, issues: ValidationIssue[]): string | undefined {
  return parseRequiredText(value, issues, {
    field: "name",
    requiredMessage: "Укажите название",
    tooLongMessage: `Название — не больше ${NAME_MAX_LENGTH} символов`,
    maxLength: NAME_MAX_LENGTH,
  });
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
