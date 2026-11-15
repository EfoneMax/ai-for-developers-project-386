/**
 * Часовой пояс владельца — IANA-имя, а не строка со смещением (ADR-0003).
 * Смещение вычисляется из имени зоны, поэтому правила зоны остаются
 * единственным источником истины, даже если они когда-нибудь изменятся.
 */
export const OWNER_TIME_ZONE = "Europe/Moscow";

const MS_PER_MINUTE = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Форматтер, раскладывающий момент на части настенных часов пояса. */
function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatters.set(timeZone, formatter);

  return formatter;
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value ?? "0");
}

/** Настенное время пояса, прочитанное как если бы оно было UTC. */
function wallClockAsUtc(instant: Date, timeZone: string): number {
  const parts = offsetFormatter(timeZone).formatToParts(instant);

  return Date.UTC(
    partValue(parts, "year"),
    partValue(parts, "month") - 1,
    partValue(parts, "day"),
    partValue(parts, "hour"),
    partValue(parts, "minute"),
    partValue(parts, "second"),
  );
}

/** Смещение пояса в минутах для конкретного момента: для Москвы +180. */
export function timeZoneOffsetMinutes(instant: Date, timeZone = OWNER_TIME_ZONE): number {
  return Math.round((wallClockAsUtc(instant, timeZone) - instant.getTime()) / MS_PER_MINUTE);
}

/** Начало календарных суток пояса, в которые попадает момент. */
export function startOfTimeZoneDay(instant: Date, timeZone = OWNER_TIME_ZONE): number {
  const offsetMinutes = timeZoneOffsetMinutes(instant, timeZone);
  const shifted = new Date(instant.getTime() + offsetMinutes * MS_PER_MINUTE);

  return (
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
    offsetMinutes * MS_PER_MINUTE
  );
}
