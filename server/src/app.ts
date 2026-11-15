import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { registerBookingsRoutes } from "./bookings/routes.js";
import { createBookingsStore, type BookingsStore } from "./bookings/store.js";
import { apiError } from "./errors.js";
import { seedDefaultMeetingTypes } from "./meeting-types/defaults.js";
import { createMeetingTypesStore, type MeetingTypesStore } from "./meeting-types/store.js";
import { registerMeetingTypesRoutes } from "./meeting-types/routes.js";
import { registerSlotsRoutes } from "./slots/routes.js";

export interface CreateAppOptions {
  logger?: boolean;
  store?: MeetingTypesStore;
  bookingsStore?: BookingsStore;
  now?: () => Date;
  /**
   * Каталог собранного фронтенда. `false` отключает раздачу статики —
   * так API-тесты не зависят от сборки `web/dist`.
   */
  webRoot?: string | false;
  /**
   * Заводит стартовые типы встреч в пустом хранилище. Включается только
   * в точке входа, чтобы API-тесты создавали ровно нужные им данные.
   */
  seedDefaults?: boolean;
}

/** Собранный фронтенд лежит рядом с репозиторием и в образе: `web/dist`. */
function defaultWebRoot(): string {
  return fileURLToPath(new URL("../../web/dist", import.meta.url));
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

  const webRoot = options.webRoot ?? defaultWebRoot();
  // В production Fastify отдаёт и API, и собранный SPA с одного origin:
  // клиент ходит в /api без отдельного адреса бэкенда.
  const servesWeb = webRoot !== false && existsSync(resolve(webRoot, "index.html"));

  if (servesWeb) {
    app.register(fastifyStatic, {
      root: webRoot,
      prefix: "/",
      setHeaders(reply, filePath) {
        // index.html ссылается на хешированные assets: его нельзя кэшировать надолго.
        if (filePath.endsWith("index.html")) {
          reply.header("cache-control", "no-cache");
        }
      },
    });
  }

  app.setNotFoundHandler((request, reply) => {
    // Клиентские маршруты React (/owner, /book) отдают тот же index.html.
    if (servesWeb && request.method === "GET" && !request.url.startsWith("/api/")) {
      return reply.sendFile("index.html");
    }

    return reply.status(404).send(apiError("NOT_FOUND", "Маршрут не найден"));
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode === 400) {
      return reply.status(400).send(apiError("VALIDATION_ERROR", "Не удалось прочитать запрос"));
    }

    if (statusCode === 404) {
      return reply.status(404).send(apiError("NOT_FOUND", "Маршрут не найден"));
    }

    // Любой другой статус (413, 415 и прочие сбои Fastify) не входит
    // в контракт: клиент получает только задокументированный 500.
    app.log.error(error);
    return reply.status(500).send(apiError("INTERNAL_ERROR", "Внутренняя ошибка сервера"));
  });

  app.get("/api/health", async () => ({ status: "ok" as const }));

  const meetingTypes = options.store ?? createMeetingTypesStore();
  const bookings = options.bookingsStore ?? createBookingsStore();
  const now = options.now ?? (() => new Date());

  if (options.seedDefaults === true) {
    seedDefaultMeetingTypes(meetingTypes, now());
  }

  registerMeetingTypesRoutes(app, { store: meetingTypes, now });
  registerSlotsRoutes(app, { meetingTypes, bookings, now });
  registerBookingsRoutes(app, { meetingTypes, bookings, now });

  return app;
}
