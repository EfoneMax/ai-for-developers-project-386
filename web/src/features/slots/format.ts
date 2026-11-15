const formatters = new Map<string, Intl.DateTimeFormat>();

function timeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
  formatters.set(timeZone, formatter);

  return formatter;
}

/** Показывает момент в поясе гостя, круглосуточно и без AM/PM. */
export function formatTimeInZone(instant: string, timeZone: string): string {
  return timeFormatter(timeZone).format(new Date(instant));
}
