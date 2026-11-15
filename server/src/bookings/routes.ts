import type { FastifyInstance } from "fastify";
import { isBookableStart } from "../domain/slots.js";
import { apiError, validationError } from "../errors.js";
import type { MeetingTypesStore } from "../meeting-types/store.js";
import type { BookingsStore } from "./store.js";
import { parseCreateBooking } from "./validation.js";

/** Зависимости маршрутов броней. */
export interface BookingsRoutesOptions {
  meetingTypes: MeetingTypesStore;
  bookings: BookingsStore;
  now: () => Date;
}

/**
 * Регистрирует создание и список предстоящих броней.
 *
 * Сервер не доверяет клиенту: перед записью он заново проверяет сетку,
 * рабочий день, окно и рабочее время. Занятость проверяется внутри
 * доменной операции бронирования — синхронно, без `await` перед вставкой.
 */
export function registerBookingsRoutes(app: FastifyInstance, options: BookingsRoutesOptions): void {
  app.post<{ Body: unknown }>("/api/bookings", async (request, reply) => {
    const parsed = parseCreateBooking(request.body);
    if (!parsed.ok) {
      return reply.status(400).send(validationError(parsed.issues));
    }

    const { meetingTypeId, start, guest } = parsed.value;
    const meetingType = options.meetingTypes.get(meetingTypeId);
    if (meetingType === undefined) {
      return reply.status(404).send(apiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден"));
    }

    if (!isBookableStart(start, meetingType.durationMinutes, options.now())) {
      return reply
        .status(400)
        .send(
          validationError([
            { field: "start", message: "Это время недоступно для записи: выберите слот из сетки" },
          ]),
        );
    }

    const booking = options.bookings.book({
      meetingType: {
        id: meetingType.id,
        name: meetingType.name,
        durationMinutes: meetingType.durationMinutes,
      },
      start,
      guest,
    });

    if (booking === undefined) {
      return reply.status(409).send(apiError("SLOT_TAKEN", "Это время только что заняли"));
    }

    return reply.status(201).send(booking);
  });

  app.get("/api/bookings", async () => ({ items: options.bookings.listUpcoming(options.now()) }));

  app.post<{ Params: { id: string } }>("/api/bookings/:id/cancel", async (request, reply) => {
    const result = options.bookings.cancel(request.params.id, options.now());

    if (result.ok) {
      return reply.status(200).send(result.booking);
    }

    if (result.reason === "not-found") {
      return reply.status(404).send(apiError("BOOKING_NOT_FOUND", "Бронь не найдена"));
    }

    return reply
      .status(409)
      .send(apiError("BOOKING_NOT_CANCELLABLE", "Эту встречу уже нельзя отменить"));
  });
}
