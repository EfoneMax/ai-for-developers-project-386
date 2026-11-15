import { overlaps, type Interval } from "../domain/bookings.js";
import { OWNER_TIME_ZONE, startOfTimeZoneDay, timeZoneOffsetMinutes } from "../domain/time-zone.js";

/** Слот — интервал, который гость может забронировать. */
export interface Slot {
  /** Начало слота в UTC, ISO 8601. */
  start: string;
  /** Конец слота в UTC; равен началу плюс длительность типа встречи. */
  end: string;
}

/** Шаг сетки стартов и границы рабочего дня по Москве. */
const SLOT_STEP_MINUTES = 30;
const WORKDAY_START_MINUTES = 9 * 60;
const WORKDAY_END_MINUTES = 18 * 60;

/** Окно записи — 14 московских календарных дат, включая сегодняшнюю. */
const BOOKING_WINDOW_DAYS = 14;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Рабочие дни владельца — понедельник–пятница. */
function isWorkday(dayStart: number, offsetMinutes: number): boolean {
  const weekday = new Date(dayStart + offsetMinutes * MS_PER_MINUTE).getUTCDay();

  return weekday >= 1 && weekday <= 5;
}

const ownerDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: OWNER_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Московская дата момента в формате `YYYY-MM-DD`. */
function ownerDate(instant: Date): string {
  const parts = ownerDateFormatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Московские даты окна записи: 14 подряд, начиная с сегодняшней.
 *
 * Возвращается вместе со слотами, чтобы клиент не строил окно по своим
 * часам: «сегодня» считает сервер.
 */
export function bookingWindowDays(now: Date): string[] {
  const firstDay = startOfTimeZoneDay(now);

  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, index) =>
    ownerDate(new Date(firstDay + index * MS_PER_DAY)),
  );
}

/**
 * Свободные слоты типа встречи по московскому календарю.
 *
 * Окно — 14 дат от сегодняшней московской; выходные пропускаются и окно
 * не продлевают. Старты идут от 09:00 с шагом 30 минут, встреча должна
 * закончиться не позже 18:00. Слоты, пересекающиеся с занятыми интервалами,
 * не возвращаются; примыкание к занятому интервалу разрешено.
 */
export function generateSlots(
  durationMinutes: number,
  now: Date,
  busy: readonly Interval[] = [],
): Slot[] {
  const offsetMinutes = timeZoneOffsetMinutes(now);
  const firstDay = startOfTimeZoneDay(now);
  const slots: Slot[] = [];

  for (let day = 0; day < BOOKING_WINDOW_DAYS; day += 1) {
    const dayStart = firstDay + day * MS_PER_DAY;

    if (!isWorkday(dayStart, offsetMinutes)) {
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

      const slot = {
        start: new Date(start).toISOString(),
        end: new Date(start + durationMinutes * MS_PER_MINUTE).toISOString(),
      };

      if (busy.some((interval) => overlaps(slot, interval))) {
        continue;
      }

      slots.push(slot);
    }
  }

  return slots;
}

/**
 * Проверяет, что запрошенный старт попадает в допустимую сетку записи.
 *
 * Сервер не доверяет клиенту: здесь заново проверяются шаг 30 минут от 09:00,
 * рабочий день, граница окна, `start > now` и `end ≤ 18:00` — ровно те же
 * правила, по которым строится ответ доступности.
 */
export function isBookableStart(start: string, durationMinutes: number, now: Date): boolean {
  return generateSlots(durationMinutes, now).some((slot) => slot.start === start);
}
