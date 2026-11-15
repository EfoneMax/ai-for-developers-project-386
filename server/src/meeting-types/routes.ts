import type { FastifyInstance } from "fastify";
import { validationError } from "../errors.js";
import type { MeetingTypesStore } from "./store.js";
import { parseCreateMeetingType, parseListQuery } from "./validation.js";

/** Зависимости маршрутов типов встреч. */
export interface MeetingTypesRoutesOptions {
  store: MeetingTypesStore;
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
}
