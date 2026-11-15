import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createMeetingTypesStore } from "../src/meeting-types/store.js";

const apps: ReturnType<typeof createApp>[] = [];

/** Четверг, 12:15 по Москве: окно записи начинается в тот же день. */
const NOW = "2026-11-12T09:15:00.000Z";

function buildApp(options: Parameters<typeof createApp>[0] = {}) {
  const app = createApp({ now: () => new Date(NOW), ...options });
  apps.push(app);
  return app;
}

async function listMeetingTypes(app: ReturnType<typeof createApp>) {
  const response = await app.inject({ method: "GET", url: "/api/meeting-types" });
  return response.json() as {
    items: Array<{
      id: string;
      name: string;
      description?: string;
      durationMinutes: number;
      createdAt: string;
    }>;
    total: number;
  };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("стартовые типы встреч", () => {
  it("заводит знакомство на 30 минут и консультацию на 60", async () => {
    const app = buildApp({ seedDefaults: true });

    const list = await listMeetingTypes(app);

    expect(list.total).toBe(2);
    expect(
      list.items.map(({ name, durationMinutes, description }) => ({
        name,
        durationMinutes,
        description,
      })),
    ).toEqual([
      {
        name: "Знакомство",
        durationMinutes: 30,
        description: "Короткий вводный звонок: обсудим задачу и решим, чем я могу помочь.",
      },
      {
        name: "Консультация",
        durationMinutes: 60,
        description: "Подробный разбор вопроса и план дальнейших шагов.",
      },
    ]);
    expect(list.items.map((item) => item.createdAt)).toEqual([NOW, NOW]);
  });

  it("не добавляет стартовые типы, если владелец уже что-то создал", async () => {
    const store = createMeetingTypesStore();
    store.create({ name: "Свой тип", durationMinutes: 15 }, new Date(NOW));
    const app = buildApp({ store, seedDefaults: true });

    const list = await listMeetingTypes(app);

    expect(list.total).toBe(1);
    expect(list.items[0]?.name).toBe("Свой тип");
  });

  it("без флага оставляет хранилище пустым", async () => {
    const app = buildApp();

    const list = await listMeetingTypes(app);

    expect(list).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it("возвращает стартовые типы после перезапуска, если их удалили", async () => {
    const first = buildApp({ seedDefaults: true });
    const seeded = await listMeetingTypes(first);

    for (const item of seeded.items) {
      const response = await first.inject({
        method: "DELETE",
        url: `/api/meeting-types/${item.id}`,
      });
      expect(response.statusCode).toBe(204);
    }

    expect((await listMeetingTypes(first)).total).toBe(0);
    expect((await listMeetingTypes(buildApp({ seedDefaults: true }))).total).toBe(2);
  });
});
