import type { FastifyInstance } from "fastify";
import type { BookingsStore } from "../bookings/store.js";
import { generateSlots } from "../domain/slots.js";
import { apiError, validationError } from "../errors.js";
import type { MeetingTypesStore } from "./store.js";
import { parseCreateMeetingType, parseListQuery } from "./validation.js";

/** Зависимости маршрутов типов встреч. */
export interface MeetingTypesRoutesOptions {
  store: MeetingTypesStore;
  bookings: BookingsStore;
  now: () => Date;
}

/** Регистрирует маршруты типов встреч. */
export function registerMeetingTypesRoutes(
  app: FastifyInstance,
  options: MeetingTypesRoutesOptions,
): void {
  app.get<{ Querystring: Record<string, unknown> }>(
    "/api/meeting-types",
    async (request, reply) => {
      const parsed = parseListQuery(request.query);
      if (!parsed.ok) {
        return reply.status(400).send(validationError(parsed.issues));
      }

      return options.store.list(parsed.value);
    },
  );

  app.post<{ Body: unknown }>("/api/meeting-types", async (request, reply) => {
    const parsed = parseCreateMeetingType(request.body);
    if (!parsed.ok) {
      return reply.status(400).send(validationError(parsed.issues));
    }

    return reply.status(201).send(options.store.create(parsed.value, options.now()));
  });

  app.get<{ Params: { id: string } }>("/api/meeting-types/:id/slots", async (request, reply) => {
    const meetingType = options.store.get(request.params.id);
    if (meetingType === undefined) {
      return reply.status(404).send(apiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден"));
    }

    return {
      slots: generateSlots(
        meetingType.durationMinutes,
        options.now(),
        options.bookings.busyIntervals(),
      ),
    };
  });
}
