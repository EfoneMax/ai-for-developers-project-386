import {
  cancelBooking as cancelBookingRequest,
  createBooking as createBookingRequest,
  listBookings as listBookingsRequest,
} from "@/client/sdk.gen";
import type { Booking, BookingCreate } from "@/client/types.gen";
import { unwrapData } from "@/lib/api-error";

/** Создаёт бронь; сервер сам проверяет сетку, занятость и поля. */
export async function createBooking(input: BookingCreate): Promise<Booking> {
  const result = await createBookingRequest({ body: input, throwOnError: false });

  return unwrapData(result);
}

/** Загружает предстоящие брони владельца, отсортированные по началу. */
export async function listBookings(): Promise<Booking[]> {
  const result = await listBookingsRequest({ throwOnError: false });

  return unwrapData(result).items;
}

/**
 * Отменяет бронь; слот снова становится доступен гостю.
 *
 * Отменить можно только подтверждённую бронь, которая ещё не закончилась:
 * иначе сервер отвечает `BOOKING_NOT_CANCELLABLE`.
 */
export async function cancelBooking(id: string): Promise<Booking> {
  const result = await cancelBookingRequest({ path: { id }, throwOnError: false });

  return unwrapData(result);
}
