import type { FastifyInstance } from "fastify";
import type { BookingsStore } from "../bookings/store.js";
import { bookingWindowDays, generateSlots } from "../domain/slots.js";
import { apiError } from "../errors.js";
import type { MeetingTypesStore } from "../meeting-types/store.js";

/** Зависимости маршрута доступности: тип встречи и общая ось занятости. */
export interface SlotsRoutesOptions {
  meetingTypes: MeetingTypesStore;
  bookings: BookingsStore;
  now: () => Date;
}

/**
 * Регистрирует доступность типа встречи.
 *
 * Маршрут отдаёт свободные слоты за всё окно; занятость приходит из хранилища
 * броней, поэтому маршрут живёт отдельно от CRUD типов встреч.
 */
export function registerSlotsRoutes(app: FastifyInstance, options: SlotsRoutesOptions): void {
  app.get<{ Params: { id: string } }>("/api/meeting-types/:id/slots", async (request, reply) => {
    const meetingType = options.meetingTypes.get(request.params.id);
    if (meetingType === undefined) {
      return reply.status(404).send(apiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден"));
    }

    const now = options.now();

    return {
      slots: generateSlots(meetingType.durationMinutes, now, options.bookings.busyIntervals()),
      windowDays: bookingWindowDays(now),
    };
  });
}
