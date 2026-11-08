import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const apps: ReturnType<typeof createApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("дымовой тест приложения", () => {
  it("запускается и отвечает на GET /api/health", async () => {
    const app = createApp();
    apps.push(app);

    await app.listen({ port: 0, host: "127.0.0.1" });

    const address = app.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Не удалось получить адрес тестового сервера");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
