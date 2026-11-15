/** Часовой пояс владельца: по нему кабинет показывает время встреч. */
const OWNER_TIME_ZONE = "Europe/Moscow";

function partsFormatter(timeZone: string, weekday: "short" | "long"): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

/** Московская дата встречи, например «чт, 12 ноября». */
export function formatMoscowDay(instant: string): string {
  const parts = partsFormatter(OWNER_TIME_ZONE, "short").formatToParts(new Date(instant));

  return `${part(parts, "weekday")}, ${part(parts, "day")} ${part(parts, "month")}`;
}

/** Интервал встречи по Москве, например «12:00–12:30». */
export function formatMoscowInterval(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: OWNER_TIME_ZONE,
  });

  return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
}

/** Дата встречи в поясе гостя, например «четверг, 13 ноября 2026». */
export function formatDayInZone(instant: string, timeZone: string): string {
  const parts = partsFormatter(timeZone, "long").formatToParts(new Date(instant));
  const weekday = part(parts, "weekday");
  const month = part(parts, "month");
  const year = part(parts, "year");

  return `${weekday}, ${part(parts, "day")} ${month} ${year}`;
}

/** Интервал встречи в поясе гостя, например «13:00–13:30». */
export function formatIntervalInZone(start: string, end: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });

  return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
}
