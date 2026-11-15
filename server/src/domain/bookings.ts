/** Интервал времени в UTC; начало включено, конец — нет. */
export interface Interval {
  /** Начало интервала в UTC, ISO 8601. */
  start: string;
  /** Конец интервала в UTC, ISO 8601. */
  end: string;
}

/**
 * Пересечение полуоткрытых интервалов `[start, end)`.
 *
 * Примыкание (`endA == startB`) пересечением не считается, поэтому встречи
 * могут идти встык (ADR-0004).
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

/** Момент UTC без смещения, с нулевыми секундами и миллисекундами. */
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/;

const MS_PER_MINUTE = 60_000;

/**
 * Конец встречи по снимку типа: `start` плюс длительность (ADR-0006).
 *
 * Конец считается в доменной операции бронирования и сохраняется, поэтому
 * правка типа позже его не пересчитывает.
 */
export function bookingEnd(start: string, durationMinutes: number): string {
  return new Date(Date.parse(start) + durationMinutes * MS_PER_MINUTE).toISOString();
}

/**
 * Разбирает момент UTC из тела запроса и приводит его к каноническому виду.
 *
 * Смещение, строка без зоны и ненулевые секунды не принимаются: в API время
 * всегда абсолютное.
 */
export function parseUtcInstant(value: unknown): string | undefined {
  if (typeof value !== "string" || !UTC_INSTANT.test(value)) {
    return undefined;
  }

  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    return undefined;
  }

  return instant.toISOString();
}
