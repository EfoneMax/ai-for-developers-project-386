import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createBookingsStore, type Booking } from "../src/bookings/store.js";

const apps: ReturnType<typeof createApp>[] = [];

/** Четверг, 12:15 по Москве: окно 12–25 ноября 2026, сегодняшние старты с 12:30. */
const NOW = "2026-11-12T09:15:00.000Z";

function buildApp({ now = NOW, seed = [] }: { now?: string; seed?: Booking[] } = {}) {
  const app = createApp({
    now: () => new Date(now),
    bookingsStore: createBookingsStore(seed),
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createMeetingType(
  app: ReturnType<typeof createApp>,
  { name = "Созвон", durationMinutes = 30 }: { name?: string; durationMinutes?: number } = {},
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/meeting-types",
    payload: { name, durationMinutes },
  });

  return response.json() as { id: string; name: string; durationMinutes: number };
}

function book(
  app: ReturnType<typeof createApp>,
  payload: { meetingTypeId: string; start: string; guest?: unknown },
) {
  return app.inject({
    method: "POST",
    url: "/api/bookings",
    payload: {
      guest: { name: "Анна", email: "anna@example.com" },
      ...payload,
    },
  });
}

async function listBookings(app: ReturnType<typeof createApp>) {
  return app.inject({ method: "GET", url: "/api/bookings" });
}

/** Бронь, созданная в обход API: нужна для состояний, которых пока нет в маршрутах. */
function seededBooking(overrides: Partial<Booking>): Booking {
  return {
    id: crypto.randomUUID(),
    status: "confirmed",
    meetingType: {
      id: "9f1a2b3c-0000-4000-8000-000000000000",
      name: "Созвон",
      durationMinutes: 30,
    },
    start: "2026-11-13T06:00:00.000Z",
    end: "2026-11-13T06:30:00.000Z",
    guest: { name: "Гость", email: "guest@example.com" },
    ...overrides,
  };
}

describe("POST /api/bookings", () => {
  it("создаёт подтверждённую бронь со снимком типа и вычисленным концом", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, { name: "Созвон по проекту" });

    const response = await book(app, {
      meetingTypeId: meetingType.id,
      start: "2026-11-13T06:00:00.000Z",
      guest: { name: "  Анна  ", email: " Anna@Example.com ", comment: "  Позвонить  " },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      status: "confirmed",
      meetingType: {
        id: meetingType.id,
        name: "Созвон по проекту",
        durationMinutes: 30,
      },
      start: "2026-11-13T06:00:00.000Z",
      end: "2026-11-13T06:30:00.000Z",
      guest: { name: "Анна", email: "Anna@Example.com", comment: "Позвонить" },
    });
  });

  it("не возвращает пустой комментарий и обрезает строки гостя", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app);

    const response = await book(app, {
      meetingTypeId: meetingType.id,
      start: "2026-11-13T06:00:00.000Z",
      guest: { name: " Анна ", email: "anna@example.com", comment: "   " },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().guest).toEqual({ name: "Анна", email: "anna@example.com" });
  });

  it("сохраняет длительность типа из снимка в конце брони", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, { durationMinutes: 45 });

    const response = await book(app, {
      meetingTypeId: meetingType.id,
      start: "2026-11-13T06:00:00.000Z",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      start: "2026-11-13T06:00:00.000Z",
      end: "2026-11-13T06:45:00.000Z",
      meetingType: { durationMinutes: 45 },
    });
  });

  it("отвечает 404 MEETING_TYPE_NOT_FOUND на неизвестный тип", async () => {
    const app = buildApp();

    const response = await book(app, {
      meetingTypeId: "9f1a2b3c-0000-4000-8000-000000000000",
      start: "2026-11-13T06:00:00.000Z",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "MEETING_TYPE_NOT_FOUND", message: expect.any(String) },
    });
  });

  it.each([
    {
      title: "пустое имя",
      guest: { name: "   ", email: "anna@example.com" },
      field: "name",
    },
    {
      title: "имя длиннее 100 символов",
      guest: { name: "А".repeat(101), email: "anna@example.com" },
      field: "name",
    },
    {
      title: "email без домена",
      guest: { name: "Анна", email: "anna@" },
      field: "email",
    },
    {
      title: "email длиннее 254 символов",
      guest: { name: "Анна", email: `${"a".repeat(250)}@example.com` },
      field: "email",
    },
    {
      title: "комментарий длиннее 1000 символов",
      guest: { name: "Анна", email: "anna@example.com", comment: "а".repeat(1001) },
      field: "comment",
    },
  ])("отвечает 400 VALIDATION_ERROR на $title", async ({ guest, field }) => {
    const app = buildApp();
    const meetingType = await createMeetingType(app);

    const response = await book(app, {
      meetingTypeId: meetingType.id,
      start: "2026-11-13T06:00:00.000Z",
      guest,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([expect.objectContaining({ field })]),
      },
    });
  });

  it.each([
    { title: "старт не по сетке 30 минут", start: "2026-11-13T06:15:00.000Z" },
    { title: "старт со смещением вместо UTC", start: "2026-11-13T09:00:00+03:00" },
    { title: "старт с ненулевыми секундами", start: "2026-11-13T06:00:30.000Z" },
    { title: "старт в выходной", start: "2026-11-14T06:00:00.000Z" },
    { title: "старт за границей окна", start: "2026-11-26T06:00:00.000Z" },
    { title: "старт раньше 09:00 по Москве", start: "2026-11-13T05:30:00.000Z" },
    { title: "старт в прошлом", start: "2026-11-12T06:00:00.000Z" },
  ])("отвечает 400 VALIDATION_ERROR: $title", async ({ start }) => {
    const app = buildApp();
    const meetingType = await createMeetingType(app);

    const response = await book(app, { meetingTypeId: meetingType.id, start });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([expect.objectContaining({ field: "start" })]),
      },
    });
  });

  it("требует, чтобы встреча закончилась не позже 18:00 по Москве", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, { durationMinutes: 60 });

    const response = await book(app, {
      meetingTypeId: meetingType.id,
      start: "2026-11-13T14:30:00.000Z",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([expect.objectContaining({ field: "start" })]),
      },
    });
  });

  it("отвечает 409 SLOT_TAKEN на точно занятый слот и оставляет одну бронь", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app);
    const payload = { meetingTypeId: meetingType.id, start: "2026-11-13T06:00:00.000Z" };

    await book(app, payload);
    const second = await book(app, payload);

    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({
      error: { code: "SLOT_TAKEN", message: expect.any(String) },
    });
    expect((await listBookings(app)).json().items).toHaveLength(1);
  });

  it("запрещает любое частичное пересечение занятого интервала", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, { durationMinutes: 60 });
    await book(app, { meetingTypeId: meetingType.id, start: "2026-11-13T06:00:00.000Z" });

    const insideEnd = await book(app, {
      meetingTypeId: meetingType.id,
      start: "2026-11-13T06:30:00.000Z",
    });

    expect(insideEnd.statusCode).toBe(409);
    expect(insideEnd.json()).toMatchObject({ error: { code: "SLOT_TAKEN" } });
  });

  it("запрещает бронь, которая полностью накрывает занятый интервал", async () => {
    const app = buildApp();
    const short = await createMeetingType(app, { name: "Короткий", durationMinutes: 30 });
    const long = await createMeetingType(app, { name: "Длинный", durationMinutes: 240 });
    await book(app, { meetingTypeId: short.id, start: "2026-11-13T06:30:00.000Z" });

    const response = await book(app, {
      meetingTypeId: long.id,
      start: "2026-11-13T06:00:00.000Z",
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "SLOT_TAKEN" } });
  });

  it("разрешает примыкание с обеих сторон занятого интервала", async () => {
    const app = buildApp();
    const long = await createMeetingType(app, { name: "Длинный", durationMinutes: 60 });
    const short = await createMeetingType(app, { name: "Короткий", durationMinutes: 30 });
    await book(app, { meetingTypeId: long.id, start: "2026-11-13T06:30:00.000Z" });

    const before = await book(app, {
      meetingTypeId: short.id,
      start: "2026-11-13T06:00:00.000Z",
    });
    const after = await book(app, {
      meetingTypeId: short.id,
      start: "2026-11-13T07:30:00.000Z",
    });

    expect(before.statusCode).toBe(201);
    expect(after.statusCode).toBe(201);
  });

  it("считает занятость по общей оси: другой тип тоже блокирует время", async () => {
    const app = buildApp();
    const first = await createMeetingType(app, { name: "Первый", durationMinutes: 30 });
    const second = await createMeetingType(app, { name: "Второй", durationMinutes: 45 });
    await book(app, { meetingTypeId: first.id, start: "2026-11-13T06:00:00.000Z" });

    const response = await book(app, {
      meetingTypeId: second.id,
      start: "2026-11-13T06:00:00.000Z",
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "SLOT_TAKEN" } });
  });

  it("не блокирует слот отменённой бронью", async () => {
    const app = buildApp({ seed: [seededBooking({ status: "cancelled" })] });
    const meetingType = await createMeetingType(app);

    const response = await book(app, {
      meetingTypeId: meetingType.id,
      start: "2026-11-13T06:00:00.000Z",
    });

    expect(response.statusCode).toBe(201);
  });

  it("даёт ровно одну бронь из двух одновременных запросов на один слот", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app);
    const payload = { meetingTypeId: meetingType.id, start: "2026-11-13T06:00:00.000Z" };

    const responses = await Promise.all([book(app, payload), book(app, payload)]);
    const statuses = responses.map((response) => response.statusCode).sort();

    expect(statuses).toEqual([201, 409]);
    expect((await listBookings(app)).json().items).toHaveLength(1);
  });
});

describe("GET /api/bookings", () => {
  it("начинает с пустого списка предстоящих", async () => {
    const app = buildApp();

    const response = await listBookings(app);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [] });
  });

  it("отдаёт предстоящие брони по возрастанию начала", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app);
    for (const start of ["2026-11-16T06:00:00.000Z", "2026-11-13T06:00:00.000Z"]) {
      await book(app, { meetingTypeId: meetingType.id, start });
    }

    const items = (await listBookings(app)).json().items as { start: string }[];

    expect(items.map((item) => item.start)).toEqual([
      "2026-11-13T06:00:00.000Z",
      "2026-11-16T06:00:00.000Z",
    ]);
  });

  it("не показывает отменённые и уже закончившиеся брони", async () => {
    const app = buildApp({
      seed: [
        seededBooking({ status: "cancelled" }),
        seededBooking({
          start: "2026-11-10T06:00:00.000Z",
          end: "2026-11-10T06:30:00.000Z",
        }),
        seededBooking({
          id: "11111111-1111-4111-8111-111111111111",
          start: "2026-11-17T06:00:00.000Z",
          end: "2026-11-17T06:30:00.000Z",
        }),
      ],
    });

    const items = (await listBookings(app)).json().items as { id: string; start: string }[];

    expect(items.map((item) => item.start)).toEqual(["2026-11-17T06:00:00.000Z"]);
  });

  it("показывает встречу, которая идёт прямо сейчас, до её конца", async () => {
    const app = buildApp({
      seed: [
        seededBooking({
          start: "2026-11-12T09:00:00.000Z",
          end: "2026-11-12T09:30:00.000Z",
        }),
      ],
    });

    const items = (await listBookings(app)).json().items as { start: string }[];

    expect(items.map((item) => item.start)).toEqual(["2026-11-12T09:00:00.000Z"]);
  });
});
