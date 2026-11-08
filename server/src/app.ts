import Fastify, { type FastifyInstance } from "fastify";

export interface CreateAppOptions {
  logger?: boolean;
}

/**
 * Собирает приложение Fastify. Отдельная функция позволяет тестам
 * поднимать сервер на свободном порту, не запуская точку входа.
 */
export function createApp(options: CreateAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.get("/api/health", async () => ({ status: "ok" as const }));

  return app;
}
