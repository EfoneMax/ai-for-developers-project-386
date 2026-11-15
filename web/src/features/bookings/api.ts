import {
  cancelBooking as cancelBookingRequest,
  createBooking as createBookingRequest,
  listBookings as listBookingsRequest,
} from "@/client/sdk.gen";
import type { Booking, BookingCreate } from "@/client/types.gen";
import { toApiError } from "@/lib/api-error";

export { ApiError } from "@/lib/api-error";

/** Создаёт бронь; сервер сам проверяет сетку, занятость и поля. */
export async function createBooking(input: BookingCreate): Promise<Booking> {
  const { data, error } = await createBookingRequest({ body: input, throwOnError: false });

  if (data !== undefined) {
    return data;
  }

  throw toApiError(error);
}

/** Загружает предстоящие брони владельца, отсортированные по началу. */
export async function listBookings(): Promise<Booking[]> {
  const { data, error } = await listBookingsRequest({ throwOnError: false });

  if (data !== undefined) {
    return data.items;
  }

  throw toApiError(error);
}

/**
 * Отменяет бронь; слот снова становится доступен гостю.
 *
 * Отменить можно только подтверждённую бронь, которая ещё не закончилась:
 * иначе сервер отвечает `BOOKING_NOT_CANCELLABLE`.
 */
export async function cancelBooking(id: string): Promise<Booking> {
  const { data, error } = await cancelBookingRequest({ path: { id }, throwOnError: false });

  if (data !== undefined) {
    return data;
  }

  throw toApiError(error);
}
