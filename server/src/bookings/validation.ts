import { parseUtcInstant } from "../domain/bookings.js";
import {
  COMMENT_MAX_LENGTH,
  EMAIL_FORMAT,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  isRecord,
  parseRequiredText,
  type ParseResult,
  type ValidationIssue,
} from "../validation.js";

/** Нормализованные поля создания брони. */
interface CreateBookingInput {
  meetingTypeId: string;
  start: string;
  guest: {
    name: string;
    email: string;
    comment?: string;
  };
}

/**
 * Проверяет тело создания брони: тип встречи, абсолютный старт и контакты.
 * Строки гостя обрезаются по краям, пустой комментарий считается отсутствующим.
 */
export function parseCreateBooking(body: unknown): ParseResult<CreateBookingInput> {
  if (!isRecord(body)) {
    return {
      ok: false,
      issues: [{ field: "guest", message: "Ожидается объект с полями брони" }],
    };
  }

  const issues: ValidationIssue[] = [];
  const meetingTypeId = parseMeetingTypeId(body.meetingTypeId, issues);
  const start = parseStart(body.start, issues);
  const guest = parseGuest(body.guest, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: { meetingTypeId: meetingTypeId!, start: start!, guest: guest! } };
}

function parseMeetingTypeId(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ field: "meetingTypeId", message: "Укажите тип встречи" });
    return undefined;
  }

  return value.trim();
}

function parseStart(value: unknown, issues: ValidationIssue[]): string | undefined {
  const start = parseUtcInstant(value);

  if (start === undefined) {
    issues.push({
      field: "start",
      message: "Начало встречи — момент UTC вида 2026-11-13T06:00:00Z",
    });
  }

  return start;
}

function parseGuest(
  value: unknown,
  issues: ValidationIssue[],
): CreateBookingInput["guest"] | undefined {
  if (!isRecord(value)) {
    issues.push({ field: "name", message: "Укажите имя" });
    return undefined;
  }

  const name = parseName(value.name, issues);
  const email = parseEmail(value.email, issues);
  const comment = parseComment(value.comment, issues);

  if (name === undefined || email === undefined) {
    return undefined;
  }

  return { name, email, ...(comment === undefined ? {} : { comment }) };
}

function parseName(value: unknown, issues: ValidationIssue[]): string | undefined {
  return parseRequiredText(value, issues, {
    field: "name",
    requiredMessage: "Укажите имя",
    tooLongMessage: `Имя — не больше ${NAME_MAX_LENGTH} символов`,
    maxLength: NAME_MAX_LENGTH,
  });
}

function parseEmail(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== "string") {
    issues.push({ field: "email", message: "Укажите email" });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    issues.push({ field: "email", message: "Укажите email" });
    return undefined;
  }
  if (trimmed.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(trimmed)) {
    issues.push({ field: "email", message: "Укажите email вида name@example.com" });
    return undefined;
  }

  return trimmed;
}

function parseComment(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push({ field: "comment", message: "Комментарий должен быть строкой" });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    issues.push({
      field: "comment",
      message: `Комментарий — не больше ${COMMENT_MAX_LENGTH} символов`,
    });
    return undefined;
  }

  return trimmed.length === 0 ? undefined : trimmed;
}
