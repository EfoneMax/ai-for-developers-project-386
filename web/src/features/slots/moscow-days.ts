import type { Slot } from "@/client/types.gen";

/** Московская дата окна записи с подписями для календаря. */
export interface MoscowDay {
  /** Дата в формате `YYYY-MM-DD` по московскому календарю. */
  key: string;
  /** Короткое название дня недели, например `чт`. */
  weekday: string;
  /** День и месяц, например `12 нояб.`. */
  dateLabel: string;
  /** Суббота или воскресенье — слотов в такие дни не бывает. */
  isWeekend: boolean;
}

/** Окно записи — 14 московских дат, включая сегодняшнюю. */
const BOOKING_WINDOW_DAYS = 14;

const MOSCOW_TIME_ZONE = "Europe/Moscow";

const moscowDateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: MOSCOW_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  timeZone: "UTC",
});

const dateLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

/**
 * Московская календарная дата момента. Дни календаря группируются
 * по Москве, а местное время гостя — только формат показа.
 */
export function moscowDateKey(instant: string | Date): string {
  const parts = moscowDateParts.formatToParts(
    typeof instant === "string" ? new Date(instant) : instant,
  );

  return [partValue(parts, "year"), partValue(parts, "month"), partValue(parts, "day")].join("-");
}

/**
 * Подпись и признаки дня по ключу `YYYY-MM-DD`. Ключ — московская дата,
 * поэтому день недели читается в UTC без повторной конвертации.
 */
function moscowDay(key: string): MoscowDay {
  const date = new Date(`${key}T00:00:00Z`);
  const weekday = date.getUTCDay();

  return {
    key,
    weekday: weekdayFormatter.format(date),
    dateLabel: dateLabelFormatter.format(date),
    isWeekend: weekday === 0 || weekday === 6,
  };
}

/**
 * Все даты окна записи: 14 подряд идущих московских дат от сегодняшней.
 * Выходные входят в окно и не продлевают его.
 */
export function getMoscowWindowDays(now: Date): MoscowDay[] {
  const today = moscowDateParts.formatToParts(now);
  const year = Number(partValue(today, "year"));
  const month = Number(partValue(today, "month"));
  const day = Number(partValue(today, "day"));

  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day + index));

    return moscowDay(date.toISOString().slice(0, 10));
  });
}

/**
 * Дни календаря: окно клиента плюс все московские даты из ответа сервера.
 *
 * Часы браузера и сервера могут расходиться, а окно сдвигается в московскую
 * полночь, поэтому день, которого нет в клиентском окне, всё равно получает
 * кнопку — иначе пришедший слот выглядел бы скрытым.
 */
export function withSlotDays(days: MoscowDay[], slots: Slot[]): MoscowDay[] {
  const byKey = new Map(days.map((day) => [day.key, day]));

  for (const slot of slots) {
    const key = moscowDateKey(slot.start);
    if (!byKey.has(key)) {
      byKey.set(key, moscowDay(key));
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Раскладывает слоты по московским датам окна. День слота считается
 * по Москве, даже если гость видит время в своём поясе.
 */
export function groupSlotsByMoscowDay(slots: Slot[]): Map<string, Slot[]> {
  const byDay = new Map<string, Slot[]>();

  for (const slot of slots) {
    const key = moscowDateKey(slot.start);
    const daySlots = byDay.get(key);

    if (daySlots === undefined) {
      byDay.set(key, [slot]);
    } else {
      daySlots.push(slot);
    }
  }

  return byDay;
}
