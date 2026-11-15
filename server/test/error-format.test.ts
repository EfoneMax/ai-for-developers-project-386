import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const apps: ReturnType<typeof createApp>[] = [];

function buildApp() {
  const app = createApp();
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("глобальный обработчик ошибок Fastify", () => {
  it("отвечает 404 NOT_FOUND на неизвестный маршрут", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
  });

  it("отвечает 400 VALIDATION_ERROR на битый JSON", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      headers: { "content-type": "application/json" },
      payload: '{"name": "Созвон"',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
  });

  it("не отдаёт 415 вне контракта: неподдерживаемый тип тела становится 500", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      headers: { "content-type": "application/xml" },
      payload: "<meetingType />",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: expect.any(String) },
    });
  });

  it("не отдаёт 413 вне контракта: слишком большое тело становится 500", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      headers: { "content-type": "application/json" },
      payload: "x".repeat(1_048_577),
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: expect.any(String) },
    });
  });

  it("превращает непредвиденное исключение в 500 без стека", async () => {
    const app = buildApp();
    app.get("/api/boom", async () => {
      throw new Error("секретный стек");
    });

    const response = await app.inject({ method: "GET", url: "/api/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: expect.any(String) },
    });
    expect(response.body).not.toContain("секретный стек");
    expect(response.json().error).not.toHaveProperty("details");
  });
});
