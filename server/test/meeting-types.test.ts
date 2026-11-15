import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createMeetingTypesStore } from "../src/meeting-types/store.js";

const apps: ReturnType<typeof createApp>[] = [];

function buildApp(now = new Date("2026-11-12T09:00:00Z")) {
  const app = createApp({ now: () => now });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("GET /api/meeting-types", () => {
  it("начинает с пустого списка и значений страницы по умолчанию", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/meeting-types" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it("отдаёт созданный тип первым и считает общее количество", async () => {
    const app = buildApp();
    await createMeetingType(app, { name: "Первый звонок", durationMinutes: 30 });
    await createMeetingType(app, { name: "Второй звонок", durationMinutes: 45 });

    const response = await app.inject({ method: "GET", url: "/api/meeting-types" });

    expect(response.json().total).toBe(2);
    expect(response.json().items.map((item: { name: string }) => item.name)).toEqual([
      "Первый звонок",
      "Второй звонок",
    ]);
  });

  it("отдаёт запрошенную страницу и сообщает её параметры", async () => {
    const app = buildApp();
    for (const name of ["Раз", "Два", "Три"]) {
      await createMeetingType(app, { name, durationMinutes: 30 });
    }

    const response = await app.inject({ method: "GET", url: "/api/meeting-types?page=2&limit=2" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      total: 3,
      page: 2,
      limit: 2,
      items: [{ name: "Три" }],
    });
  });
});

describe("POST /api/meeting-types", () => {
  it("создаёт тип встречи с серверным id и временем создания", async () => {
    const app = buildApp(new Date("2026-11-12T09:15:00.000Z"));

    const response = await createMeetingType(app, {
      name: "  Созвон по проекту  ",
      description: "  Обсудим сроки  ",
      durationMinutes: 30,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
      name: "Созвон по проекту",
      description: "Обсудим сроки",
      durationMinutes: 30,
      createdAt: "2026-11-12T09:15:00.000Z",
    });
  });

  it("создаёт тип без описания, если оно не передано", async () => {
    const app = buildApp();

    const response = await createMeetingType(app, { name: "Короткий звонок", durationMinutes: 5 });

    expect(response.statusCode).toBe(201);
    expect(response.json()).not.toHaveProperty("description");
  });

  it("разрешает одинаковые названия и различает типы по id", async () => {
    const app = buildApp();

    const first = await createMeetingType(app, { name: "Один и тот же", durationMinutes: 30 });
    const second = await createMeetingType(app, { name: "Один и тот же", durationMinutes: 60 });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json().id).not.toBe(first.json().id);
  });
});

describe("валидация типа встречи", () => {
  it.each([
    { payload: { name: "   ", durationMinutes: 30 }, field: "name" },
    { payload: { name: "я".repeat(101), durationMinutes: 30 }, field: "name" },
    { payload: { durationMinutes: 30 }, field: "name" },
    { payload: { name: "Звонок", durationMinutes: 4 }, field: "durationMinutes" },
    { payload: { name: "Звонок", durationMinutes: 241 }, field: "durationMinutes" },
    { payload: { name: "Звонок", durationMinutes: 30.5 }, field: "durationMinutes" },
    { payload: { name: "Звонок", durationMinutes: "30" }, field: "durationMinutes" },
    { payload: { name: "Звонок" }, field: "durationMinutes" },
    {
      payload: { name: "Звонок", durationMinutes: 30, description: "я".repeat(1001) },
      field: "description",
    },
    { payload: { name: "Звонок", durationMinutes: 30, description: 42 }, field: "description" },
  ])("отвечает 400 с ошибкой поля для $payload", async ({ payload, field }) => {
    const app = buildApp();

    const response = await app.inject({ method: "POST", url: "/api/meeting-types", payload });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(
      response.json().error.details.map((detail: { field: string }) => detail.field),
    ).toContain(field);
    const list = await app.inject({ method: "GET", url: "/api/meeting-types" });
    expect(list.json().total).toBe(0);
  });

  it("возвращает все неверные поля сразу", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      payload: { name: "", durationMinutes: 1000 },
    });

    expect(
      response
        .json()
        .error.details.map((detail: { field: string }) => detail.field)
        .sort(),
    ).toEqual(["durationMinutes", "name"]);
  });

  it("принимает пустое описание и не возвращает его", async () => {
    const app = buildApp();

    const response = await createMeetingType(app, {
      name: "Звонок",
      description: "",
      durationMinutes: 30,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).not.toHaveProperty("description");
  });
});

describe("валидация параметров списка", () => {
  it.each(["page=0", "page=abc", "page=1.5", "limit=0", "limit=101", "limit=2.5"])(
    "отвечает 400 на %s",
    async (query) => {
      const app = buildApp();

      const response = await app.inject({ method: "GET", url: `/api/meeting-types?${query}` });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
      expect(response.json().error.details[0].field).toBe(query.split("=")[0]);
    },
  );
});

describe("конверт ошибок", () => {
  it("отвечает 404 NOT_FOUND на неизвестный маршрут", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
  });

  it("отвечает 500 INTERNAL_ERROR без стека на непредвиденную ошибку", async () => {
    const store = createMeetingTypesStore();
    const app = createApp({
      store: {
        ...store,
        create() {
          throw new Error("секретный стек");
        },
      },
    });
    apps.push(app);

    const response = await createMeetingType(app, { name: "Звонок", durationMinutes: 30 });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: expect.any(String) },
    });
    expect(response.body).not.toContain("секретный стек");
  });
});

async function createMeetingType(
  app: ReturnType<typeof createApp>,
  payload: { name: string; description?: string; durationMinutes: number },
) {
  return app.inject({ method: "POST", url: "/api/meeting-types", payload });
}
