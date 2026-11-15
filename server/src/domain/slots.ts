/** Слот — интервал, который гость может забронировать. */
export interface Slot {
  /** Начало слота в UTC, ISO 8601. */
  start: string;
  /** Конец слота в UTC; равен началу плюс длительность типа встречи. */
  end: string;
}

/** Часовой пояс владельца: постоянное смещение +03:00, переходов нет. */
const MOSCOW_OFFSET_MINUTES = 3 * 60;

/** Шаг сетки стартов и границы рабочего дня по Москве. */
const SLOT_STEP_MINUTES = 30;
const WORKDAY_START_MINUTES = 9 * 60;
const WORKDAY_END_MINUTES = 18 * 60;

/** Окно записи — 14 московских календарных дат, включая сегодняшнюю. */
export const BOOKING_WINDOW_DAYS = 14;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Начало московских суток, в которые попадает момент `now`. */
function startOfMoscowDay(now: Date): number {
  const shifted = new Date(now.getTime() + MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE);

  return (
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
    MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE
  );
}

/** Рабочие дни владельца — понедельник–пятница. */
function isWorkday(dayStart: number): boolean {
  const weekday = new Date(dayStart + MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE).getUTCDay();

  return weekday >= 1 && weekday <= 5;
}

/**
 * Свободные слоты типа встречи по московскому календарю.
 *
 * Окно — 14 дат от сегодняшней московской; выходные пропускаются и окно
 * не продлевают. Старты идут от 09:00 с шагом 30 минут, встреча должна
 * закончиться не позже 18:00.
 */
export function generateSlots(durationMinutes: number, now: Date): Slot[] {
  const firstDay = startOfMoscowDay(now);
  const slots: Slot[] = [];

  for (let day = 0; day < BOOKING_WINDOW_DAYS; day += 1) {
    const dayStart = firstDay + day * MS_PER_DAY;

    if (!isWorkday(dayStart)) {
      continue;
    }

    for (
      let startMinutes = WORKDAY_START_MINUTES;
      startMinutes + durationMinutes <= WORKDAY_END_MINUTES;
      startMinutes += SLOT_STEP_MINUTES
    ) {
      const start = dayStart + startMinutes * MS_PER_MINUTE;

      if (start <= now.getTime()) {
        continue;
      }

      slots.push({
        start: new Date(start).toISOString(),
        end: new Date(start + durationMinutes * MS_PER_MINUTE).toISOString(),
      });
    }
  }

  return slots;
}
