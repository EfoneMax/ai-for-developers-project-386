import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { registerBookingsRoutes } from "./bookings/routes.js";
import { createBookingsStore, type BookingsStore } from "./bookings/store.js";
import { apiError } from "./errors.js";
import { createMeetingTypesStore, type MeetingTypesStore } from "./meeting-types/store.js";
import { registerMeetingTypesRoutes } from "./meeting-types/routes.js";

export interface CreateAppOptions {
  logger?: boolean;
  store?: MeetingTypesStore;
  bookingsStore?: BookingsStore;
  now?: () => Date;
}

/**
 * Собирает приложение Fastify. Отдельная функция позволяет тестам
 * поднимать сервер на свободном порту, не запуская точку входа.
 *
 * Хранилища создаются вместе с приложением, поэтому каждый API-тест
 * начинает с чистого состояния. Маршруты типов и броней делят одно
 * хранилище броней: занятость считается по общей оси владельца.
 */
export function createApp(options: CreateAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send(apiError("NOT_FOUND", "Маршрут не найден"));
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(400).send(apiError("VALIDATION_ERROR", "Не удалось прочитать запрос"));
    }

    app.log.error(error);
    return reply.status(500).send(apiError("INTERNAL_ERROR", "Внутренняя ошибка сервера"));
  });

  app.get("/api/health", async () => ({ status: "ok" as const }));

  const meetingTypes = options.store ?? createMeetingTypesStore();
  const bookings = options.bookingsStore ?? createBookingsStore();
  const now = options.now ?? (() => new Date());

  registerMeetingTypesRoutes(app, { store: meetingTypes, bookings, now });
  registerBookingsRoutes(app, { meetingTypes, bookings, now });

  return app;
}
