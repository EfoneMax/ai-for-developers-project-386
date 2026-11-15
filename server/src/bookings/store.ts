import { randomUUID } from "node:crypto";
import { overlaps, type Interval } from "../domain/bookings.js";

/** Статус брони: отменённая больше не занимает слот. */
type BookingStatus = "confirmed" | "cancelled";

/** Снимок типа встречи на момент записи (ADR-0006). */
interface BookingMeetingTypeSnapshot {
  id: string;
  name: string;
  durationMinutes: number;
}

/** Контактные данные гостя; гость не учётная запись. */
interface BookingGuest {
  name: string;
  email: string;
  comment?: string;
}

/** Бронь в хранилище. */
export interface Booking {
  id: string;
  status: BookingStatus;
  meetingType: BookingMeetingTypeSnapshot;
  start: string;
  end: string;
  guest: BookingGuest;
}

/** Данные новой брони; интервал уже посчитан по снимку типа. */
interface NewBooking {
  meetingType: BookingMeetingTypeSnapshot;
  start: string;
  end: string;
  guest: BookingGuest;
}

/** Хранилище броней в памяти процесса. */
export interface BookingsStore {
  /**
   * Бронирует слот атомарно: проверка занятости и вставка идут синхронно,
   * без `await` между ними (ADR-0004). `undefined` — слот уже занят.
   */
  book(input: NewBooking): Booking | undefined;

  /** Предстоящие брони: подтверждённые, у которых `end > now`, по началу. */
  listUpcoming(now: Date): Booking[];

  /** Интервалы подтверждённых броней — общая ось занятости владельца. */
  busyIntervals(): Interval[];
}

/**
 * Создаёт хранилище броней. Начальные брони нужны тестам и будущим
 * сценариям: отмену выполняет владелец, отдельного reset-эндпоинта нет.
 */
export function createBookingsStore(seed: readonly Booking[] = []): BookingsStore {
  const bookings: Booking[] = [...seed];

  return {
    book(input) {
      const taken = bookings.some(
        (booking) => booking.status === "confirmed" && overlaps(input, booking),
      );

      if (taken) {
        return undefined;
      }

      const booking: Booking = {
        id: randomUUID(),
        status: "confirmed",
        meetingType: input.meetingType,
        start: input.start,
        end: input.end,
        guest: input.guest,
      };

      bookings.push(booking);
      return booking;
    },

    listUpcoming(now) {
      const moment = now.getTime();

      return bookings
        .filter((booking) => booking.status === "confirmed" && Date.parse(booking.end) > moment)
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    },

    busyIntervals() {
      return bookings
        .filter((booking) => booking.status === "confirmed")
        .map(({ start, end }) => ({ start, end }));
    },
  };
}
