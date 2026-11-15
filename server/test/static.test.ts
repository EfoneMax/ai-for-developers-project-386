import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const apps: ReturnType<typeof createApp>[] = [];
const roots: string[] = [];

function buildApp(options: Parameters<typeof createApp>[0] = {}) {
  const app = createApp(options);
  apps.push(app);
  return app;
}

/** Собранный фронтенд: index.html и хешированный asset. */
function webFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "call-booking-web-"));
  roots.push(root);
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "index.html"), '<!doctype html><div id="root"></div>');
  writeFileSync(join(root, "assets", "app.js"), "console.log('app');");
  return root;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("раздача собранного фронтенда", () => {
  it("отдаёт index.html для клиентского маршрута и assets по пути", async () => {
    const app = buildApp({ webRoot: webFixture() });

    const page = await app.inject({ method: "GET", url: "/owner" });
    expect(page.statusCode).toBe(200);
    expect(page.headers["content-type"]).toContain("text/html");
    expect(page.headers["cache-control"]).toBe("no-cache");
    expect(page.body).toContain('<div id="root"></div>');

    const asset = await app.inject({ method: "GET", url: "/assets/app.js" });
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toBe("console.log('app');");
  });

  it("оставляет 404 в контракте API, даже когда фронтенд включён", async () => {
    const app = buildApp({ webRoot: webFixture() });

    const response = await app.inject({ method: "GET", url: "/api/unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
  });

  it("без каталога сборки отвечает 404 на клиентский маршрут", async () => {
    const app = buildApp({ webRoot: false });

    const response = await app.inject({ method: "GET", url: "/owner" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
  });
});
