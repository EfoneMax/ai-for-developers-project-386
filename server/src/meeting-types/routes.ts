import type { FastifyInstance } from "fastify";
import { apiError, validationError } from "../errors.js";
import type { MeetingTypesStore } from "./store.js";
import { parseCreateMeetingType, parseListQuery, parseUpdateMeetingType } from "./validation.js";

/** Зависимости маршрутов типов встреч. */
export interface MeetingTypesRoutesOptions {
  store: MeetingTypesStore;
  now: () => Date;
}

/** Регистрирует CRUD типов встреч; доступность живёт в отдельном модуле. */
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

  app.patch<{ Params: { id: string }; Body: unknown }>(
    "/api/meeting-types/:id",
    async (request, reply) => {
      if (options.store.get(request.params.id) === undefined) {
        return reply.status(404).send(meetingTypeNotFound());
      }

      const parsed = parseUpdateMeetingType(request.body);
      if (!parsed.ok) {
        return reply.status(400).send(validationError(parsed.issues));
      }

      const updated = options.store.update(request.params.id, parsed.value);
      if (updated === undefined) {
        return reply.status(404).send(meetingTypeNotFound());
      }

      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/meeting-types/:id", async (request, reply) => {
    const removed = options.store.remove(request.params.id);

    if (!removed) {
      return reply.status(404).send(meetingTypeNotFound());
    }

    return reply.status(204).send();
  });
}

function meetingTypeNotFound() {
  return apiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден");
}
