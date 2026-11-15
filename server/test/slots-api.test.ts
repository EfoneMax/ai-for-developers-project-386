import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const apps: ReturnType<typeof createApp>[] = [];

function buildApp(now = "2026-11-12T09:15:00.000Z") {
  const app = createApp({ now: () => new Date(now) });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createMeetingType(app: ReturnType<typeof createApp>, durationMinutes: number) {
  const response = await app.inject({
    method: "POST",
    url: "/api/meeting-types",
    payload: { name: "Созвон", durationMinutes },
  });

  return response.json() as { id: string };
}

async function getSlots(app: ReturnType<typeof createApp>, id: string) {
  return app.inject({ method: "GET", url: `/api/meeting-types/${id}/slots` });
}

/** Московская дата момента: пояс владельца — постоянный UTC+3. */
function moscowDate(instant: string): string {
  return new Date(new Date(instant).getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe("GET /api/meeting-types/{id}/slots", () => {
  it("отдаёт свободные слоты типа в UTC, отсортированные по началу", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, 30);

    const response = await getSlots(app, meetingType.id);

    expect(response.statusCode).toBe(200);

    const slots = response.json().slots as { start: string; end: string }[];
    expect(slots[0]).toEqual({
      start: "2026-11-12T09:30:00.000Z",
      end: "2026-11-12T10:00:00.000Z",
    });
    expect(slots.at(-1)).toEqual({
      start: "2026-11-25T14:30:00.000Z",
      end: "2026-11-25T15:00:00.000Z",
    });

    const starts = slots.map((slot) => slot.start);
    expect(starts).toEqual([...starts].sort());
  });

  it("отдаёт моменты с нулевыми секундами и миллисекундами в зоне Z", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, 30);

    const slots = (await getSlots(app, meetingType.id)).json().slots as { start: string }[];

    for (const slot of slots) {
      expect(slot.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    }
  });

  it("отвечает 404 MEETING_TYPE_NOT_FOUND на неизвестный тип", async () => {
    const app = buildApp();

    const response = await getSlots(app, "9f1a2b3c-0000-4000-8000-000000000000");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "MEETING_TYPE_NOT_FOUND", message: expect.any(String) },
    });
  });

  it("строит окно по 14 московским датам серверных часов", async () => {
    const app = buildApp("2026-11-12T09:15:00.000Z");
    const meetingType = await createMeetingType(app, 30);

    const slots = (await getSlots(app, meetingType.id)).json().slots as { start: string }[];
    const days = [...new Set(slots.map((slot) => moscowDate(slot.start)))];

    expect(days).toEqual([
      "2026-11-12",
      "2026-11-13",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
    ]);
  });

  it("не предлагает уже прошедшие сегодняшние старты", async () => {
    const app = buildApp("2026-11-12T09:15:00.000Z");
    const meetingType = await createMeetingType(app, 30);

    const slots = (await getSlots(app, meetingType.id)).json().slots as { start: string }[];

    expect(moscowDate(slots[0]!.start)).toBe("2026-11-12");
    expect(slots[0]!.start).toBe("2026-11-12T09:30:00.000Z");
  });

  it("учитывает длительность типа при последнем старте", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, 60);

    const slots = (await getSlots(app, meetingType.id)).json().slots as {
      start: string;
      end: string;
    }[];
    const nextDay = slots.filter((slot) => moscowDate(slot.start) === "2026-11-13");

    expect(nextDay.at(-1)).toEqual({
      start: "2026-11-13T14:00:00.000Z",
      end: "2026-11-13T15:00:00.000Z",
    });
  });

  it("не принимает дату, диапазон или пояс: query-параметры не влияют на ответ", async () => {
    const app = buildApp();
    const meetingType = await createMeetingType(app, 30);

    const plain = await getSlots(app, meetingType.id);
    const withQuery = await app.inject({
      method: "GET",
      url: `/api/meeting-types/${meetingType.id}/slots?date=2026-11-20&timeZone=Asia/Tokyo&from=2026-11-01&to=2026-12-01`,
    });

    expect(withQuery.statusCode).toBe(200);
    expect(withQuery.json()).toEqual(plain.json());
  });
});
