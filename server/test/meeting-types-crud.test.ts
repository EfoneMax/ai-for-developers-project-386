import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const apps: ReturnType<typeof createApp>[] = [];

function buildApp(now = new Date("2026-11-12T09:00:00Z")) {
  const app = createApp({ now: () => now });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createMeetingType(
  app: ReturnType<typeof createApp>,
  payload: { name: string; description?: string; durationMinutes: number },
) {
  const response = await app.inject({ method: "POST", url: "/api/meeting-types", payload });
  return response.json() as {
    id: string;
    name: string;
    description?: string;
    durationMinutes: number;
    createdAt: string;
  };
}

async function patchMeetingType(
  app: ReturnType<typeof createApp>,
  id: string,
  payload: Record<string, unknown>,
) {
  return await app.inject({ method: "PATCH", url: `/api/meeting-types/${id}`, payload });
}

describe("PATCH /api/meeting-types/{id}", () => {
  it("меняет только переданное название, сохраняя остальные поля", async () => {
    const app = buildApp(new Date("2026-11-12T09:15:00.000Z"));
    const created = await createMeetingType(app, {
      name: "Созвон по проекту",
      description: "Обсудим сроки",
      durationMinutes: 45,
    });

    const response = await patchMeetingType(app, created.id, { name: "  Созвон по бюджету  " });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: created.id,
      name: "Созвон по бюджету",
      description: "Обсудим сроки",
      durationMinutes: 45,
      createdAt: "2026-11-12T09:15:00.000Z",
    });

    const list = await app.inject({ method: "GET", url: "/api/meeting-types" });
    expect(list.json().items).toEqual([response.json()]);
  });

  it("меняет длительность, не трогая название и описание", async () => {
    const app = buildApp();
    const created = await createMeetingType(app, {
      name: "Длинный звонок",
      description: "Час разговора",
      durationMinutes: 60,
    });

    const response = await patchMeetingType(app, created.id, { durationMinutes: 30 });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      name: "Длинный звонок",
      description: "Час разговора",
      durationMinutes: 30,
    });
  });

  it("убирает описание, когда приходит пустая строка", async () => {
    const app = buildApp();
    const created = await createMeetingType(app, {
      name: "Звонок",
      description: "Черновик",
      durationMinutes: 30,
    });

    const response = await patchMeetingType(app, created.id, { description: "   " });

    expect(response.statusCode).toBe(200);
    expect(response.json()).not.toHaveProperty("description");
  });

  it("отвечает 400 на пустое тело и ничего не меняет", async () => {
    const app = buildApp();
    const created = await createMeetingType(app, { name: "Звонок", durationMinutes: 30 });

    const response = await patchMeetingType(app, created.id, {});

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    const list = await app.inject({ method: "GET", url: "/api/meeting-types" });
    expect(list.json().items).toEqual([created]);
  });

  it.each([
    { payload: { id: "11111111-1111-4111-8111-111111111111" }, field: "id" },
    { payload: { createdAt: "2020-01-01T00:00:00.000Z" }, field: "createdAt" },
  ])("отвечает 400, когда клиент пытается изменить $field", async ({ payload, field }) => {
    const app = buildApp();
    const created = await createMeetingType(app, { name: "Звонок", durationMinutes: 30 });

    const response = await patchMeetingType(app, created.id, payload);

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(
      response.json().error.details.map((detail: { field: string }) => detail.field),
    ).toContain(field);
  });

  it.each([
    { payload: { name: "   " }, field: "name" },
    { payload: { name: "я".repeat(101) }, field: "name" },
    { payload: { name: 42 }, field: "name" },
    { payload: { durationMinutes: 4 }, field: "durationMinutes" },
    { payload: { durationMinutes: 241 }, field: "durationMinutes" },
    { payload: { durationMinutes: 30.5 }, field: "durationMinutes" },
    { payload: { durationMinutes: "30" }, field: "durationMinutes" },
    { payload: { description: "я".repeat(1001) }, field: "description" },
    { payload: { description: 42 }, field: "description" },
  ])("отвечает 400 с ошибкой поля для $payload", async ({ payload, field }) => {
    const app = buildApp();
    const created = await createMeetingType(app, { name: "Звонок", durationMinutes: 30 });

    const response = await patchMeetingType(app, created.id, payload);

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(
      response.json().error.details.map((detail: { field: string }) => detail.field),
    ).toContain(field);
  });

  it("отвечает 404 MEETING_TYPE_NOT_FOUND на неизвестный тип", async () => {
    const app = buildApp();

    const response = await patchMeetingType(app, "unknown-id", { name: "Звонок" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "MEETING_TYPE_NOT_FOUND", message: expect.any(String) },
    });
  });

  it("не меняет другой тип с тем же названием", async () => {
    const app = buildApp();
    const first = await createMeetingType(app, { name: "Одинаковый", durationMinutes: 30 });
    const second = await createMeetingType(app, { name: "Одинаковый", durationMinutes: 60 });

    await patchMeetingType(app, first.id, { durationMinutes: 15 });

    const list = await app.inject({ method: "GET", url: "/api/meeting-types" });
    expect(list.json().items).toEqual([
      { ...first, durationMinutes: 15 },
      expect.objectContaining({ id: second.id, durationMinutes: 60 }),
    ]);
  });
});

describe("DELETE /api/meeting-types/{id}", () => {
  it("удаляет тип и отвечает 204 без тела", async () => {
    const app = buildApp();
    const created = await createMeetingType(app, { name: "Звонок", durationMinutes: 30 });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/meeting-types/${created.id}`,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");

    const list = await app.inject({ method: "GET", url: "/api/meeting-types" });
    expect(list.json()).toEqual({ items: [], total: 0, page: 1, limit: 20 });

    const slots = await app.inject({
      method: "GET",
      url: `/api/meeting-types/${created.id}/slots`,
    });
    expect(slots.statusCode).toBe(404);
    expect(slots.json().error.code).toBe("MEETING_TYPE_NOT_FOUND");
  });

  it("отвечает 404 на неизвестный тип", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "DELETE", url: "/api/meeting-types/unknown-id" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "MEETING_TYPE_NOT_FOUND", message: expect.any(String) },
    });
  });
});

/** Четверг, 12:15 по Москве: окно 12–25 ноября 2026. */
const NOW = "2026-11-12T09:15:00.000Z";

async function book(app: ReturnType<typeof createApp>, meetingTypeId: string, start: string) {
  return await app.inject({
    method: "POST",
    url: "/api/bookings",
    payload: {
      meetingTypeId,
      start,
      guest: { name: "Анна", email: "anna@example.com" },
    },
  });
}

async function slotStarts(app: ReturnType<typeof createApp>, meetingTypeId: string) {
  const response = await app.inject({
    method: "GET",
    url: `/api/meeting-types/${meetingTypeId}/slots`,
  });

  return (response.json().slots as { start: string }[]).map((slot) => slot.start);
}

describe("снимок типа встречи в брони (ADR-0006)", () => {
  it("удаление типа с предстоящей бронью не отменяет бронь и не освобождает слот", async () => {
    const app = buildApp(new Date(NOW));
    const meetingType = await createMeetingType(app, {
      name: "Созвон по проекту",
      durationMinutes: 60,
    });
    const booking = await book(app, meetingType.id, "2026-11-13T06:00:00.000Z");
    expect(booking.statusCode).toBe(201);

    const deletion = await app.inject({
      method: "DELETE",
      url: `/api/meeting-types/${meetingType.id}`,
    });
    expect(deletion.statusCode).toBe(204);

    const bookings = await app.inject({ method: "GET", url: "/api/bookings" });
    expect(bookings.json().items).toEqual([
      expect.objectContaining({
        status: "confirmed",
        start: "2026-11-13T06:00:00.000Z",
        end: "2026-11-13T07:00:00.000Z",
        meetingType: {
          id: meetingType.id,
          name: "Созвон по проекту",
          durationMinutes: 60,
        },
      }),
    ]);

    const other = await createMeetingType(app, { name: "Другой звонок", durationMinutes: 30 });
    const starts = await slotStarts(app, other.id);
    expect(starts).not.toContain("2026-11-13T06:00:00.000Z");
    expect(starts).not.toContain("2026-11-13T06:30:00.000Z");
    expect(starts).toContain("2026-11-13T07:00:00.000Z");
  });

  it("правка длительности не переписывает уже созданную бронь и её конец", async () => {
    const app = buildApp(new Date(NOW));
    const meetingType = await createMeetingType(app, {
      name: "Час разговора",
      durationMinutes: 60,
    });
    await book(app, meetingType.id, "2026-11-13T06:00:00.000Z");

    const response = await patchMeetingType(app, meetingType.id, { durationMinutes: 30 });
    expect(response.statusCode).toBe(200);
    expect(response.json().durationMinutes).toBe(30);

    const bookings = await app.inject({ method: "GET", url: "/api/bookings" });
    expect(bookings.json().items[0]).toMatchObject({
      start: "2026-11-13T06:00:00.000Z",
      end: "2026-11-13T07:00:00.000Z",
      meetingType: { name: "Час разговора", durationMinutes: 60 },
    });

    const starts = await slotStarts(app, meetingType.id);
    expect(starts).not.toContain("2026-11-13T06:00:00.000Z");
    expect(starts).not.toContain("2026-11-13T06:30:00.000Z");
    expect(starts).toContain("2026-11-13T07:00:00.000Z");
  });
});

async function listQuery(app: ReturnType<typeof createApp>, query: string) {
  return app.inject({ method: "GET", url: `/api/meeting-types?${query}` });
}

function names(response: { json(): { items: { name: string }[] } }): string[] {
  return response.json().items.map((item) => item.name);
}

describe("сортировка списка типов встреч", () => {
  async function seedCatalog() {
    const app = buildApp();
    await createMeetingType(app, { name: "яблочный звонок", durationMinutes: 30 });
    await createMeetingType(app, { name: "Ананасовый звонок", durationMinutes: 60 });
    await createMeetingType(app, { name: "Банановый звонок", durationMinutes: 15 });
    return app;
  }

  it("сортирует по названию с учётом алфавита и регистра", async () => {
    const app = await seedCatalog();

    const ascending = await listQuery(app, "sort=name&order=asc");
    const descending = await listQuery(app, "sort=name&order=desc");

    expect(names(ascending)).toEqual(["Ананасовый звонок", "Банановый звонок", "яблочный звонок"]);
    expect(names(descending)).toEqual(["яблочный звонок", "Банановый звонок", "Ананасовый звонок"]);
  });

  it("сортирует по длительности", async () => {
    const app = await seedCatalog();

    const response = await listQuery(app, "sort=durationMinutes&order=asc");

    expect(
      response.json().items.map((item: { durationMinutes: number }) => item.durationMinutes),
    ).toEqual([15, 30, 60]);
  });

  it("сортирует по времени создания: старые сверху по умолчанию, новые — при order=desc", async () => {
    let clock = new Date("2026-11-12T09:00:00Z");
    const app = createApp({ now: () => clock });
    apps.push(app);
    for (const name of ["Первый", "Второй", "Третий"]) {
      clock = new Date(clock.getTime() + 60_000);
      await createMeetingType(app, { name, durationMinutes: 30 });
    }

    expect(names(await listQuery(app, ""))).toEqual(["Первый", "Второй", "Третий"]);
    expect(names(await listQuery(app, "sort=createdAt&order=desc"))).toEqual([
      "Третий",
      "Второй",
      "Первый",
    ]);
  });
});

describe("поиск по каталогу типов встреч", () => {
  async function seedCatalog() {
    const app = buildApp();
    await createMeetingType(app, {
      name: "Созвон по проекту",
      description: "Обсудим сроки и бюджет",
      durationMinutes: 30,
    });
    await createMeetingType(app, { name: "Знакомство", durationMinutes: 15 });
    await createMeetingType(app, {
      name: "Разбор итогов",
      description: "Проектные риски",
      durationMinutes: 60,
    });
    return app;
  }

  it("ищет подстроку по названию без учёта регистра", async () => {
    const app = await seedCatalog();

    const response = await listQuery(app, "search=СОЗВОН");

    expect(names(response)).toEqual(["Созвон по проекту"]);
  });

  it("ищет подстроку по описанию без учёта регистра", async () => {
    const app = await seedCatalog();

    const response = await listQuery(app, "search=проектные");

    expect(names(response)).toEqual(["Разбор итогов"]);
  });

  it("возвращает и название, и описание в общем результате", async () => {
    const app = await seedCatalog();

    const response = await listQuery(app, "search=проект");

    expect(names(response)).toEqual(["Созвон по проекту", "Разбор итогов"]);
  });

  it("считает total по найденным типам и уважает страницу", async () => {
    const app = await seedCatalog();

    const response = await listQuery(app, "search=проект&limit=1&page=2");

    expect(response.json()).toMatchObject({
      total: 2,
      page: 2,
      limit: 1,
      items: [{ name: "Разбор итогов" }],
    });
  });

  it("возвращает пустой список, когда ничего не найдено", async () => {
    const app = await seedCatalog();

    const response = await listQuery(app, "search=отпуск");

    expect(response.json()).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it("не фильтрует по пустой строке поиска", async () => {
    const app = await seedCatalog();

    const response = await listQuery(app, "search=");

    expect(response.json().total).toBe(3);
  });
});

describe("валидация параметров списка: сортировка, порядок и поиск", () => {
  it.each([
    { query: "sort=title", field: "sort" },
    { query: "order=up", field: "order" },
  ])("отвечает 400 на $query", async ({ query, field }) => {
    const app = buildApp();

    const response = await listQuery(app, query);

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(
      response.json().error.details.map((detail: { field: string }) => detail.field),
    ).toContain(field);
  });

  it("отвечает 400, когда параметр поиска передан дважды", async () => {
    const app = buildApp();

    const response = await listQuery(app, "search=один&search=два");

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(response.json().error.details[0].field).toBe("search");
  });
});
