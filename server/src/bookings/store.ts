import { randomUUID } from "node:crypto";
import { bookingEnd, overlaps, type Interval } from "../domain/bookings.js";

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

/** Данные новой брони; конец интервала вычисляет доменная операция. */
interface NewBooking {
  meetingType: BookingMeetingTypeSnapshot;
  start: string;
  guest: BookingGuest;
}

/** Хранилище броней в памяти процесса. */
export interface BookingsStore {
  /**
   * Бронирует слот атомарно: конец считается по снимку типа, проверка
   * занятости и вставка идут синхронно, без `await` между ними (ADR-0004).
   * `undefined` — слот уже занят.
   */
  book(input: NewBooking): Booking | undefined;

  /**
   * Отменяет бронь: единственный переход `confirmed → cancelled`. Запись
   * сохраняется, снимок типа и время не пересчитываются. Отменить можно,
   * пока `end > now`; иначе причина отказа.
   */
  cancel(id: string, now: Date): CancelBookingResult;

  /** Предстоящие брони: подтверждённые, у которых `end > now`, по началу. */
  listUpcoming(now: Date): Booking[];

  /** Интервалы подтверждённых броней — общая ось занятости владельца. */
  busyIntervals(): Interval[];
}

/** Исход отмены: отменённая бронь или причина отказа. */
type CancelBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "not-found" | "not-cancellable" };

/**
 * Создаёт хранилище броней. Начальные брони нужны тестам и будущим
 * сценариям: отмену выполняет владелец, отдельного reset-эндпоинта нет.
 */
export function createBookingsStore(seed: readonly Booking[] = []): BookingsStore {
  const bookings: Booking[] = [...seed];

  return {
    book(input) {
      const slot = {
        start: input.start,
        end: bookingEnd(input.start, input.meetingType.durationMinutes),
      };
      const taken = bookings.some(
        (booking) => booking.status === "confirmed" && overlaps(slot, booking),
      );

      if (taken) {
        return undefined;
      }

      const booking: Booking = {
        id: randomUUID(),
        status: "confirmed",
        meetingType: input.meetingType,
        start: slot.start,
        end: slot.end,
        guest: input.guest,
      };

      bookings.push(booking);
      return booking;
    },

    cancel(id, now) {
      const booking = bookings.find((item) => item.id === id);

      if (booking === undefined) {
        return { ok: false, reason: "not-found" };
      }

      if (booking.status === "cancelled" || Date.parse(booking.end) <= now.getTime()) {
        return { ok: false, reason: "not-cancellable" };
      }

      booking.status = "cancelled";
      return { ok: true, booking };
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
