import { defineConfig, devices } from "@playwright/test";

const API_PORT = Number(process.env.E2E_API_PORT ?? 3000);
const PREVIEW_PORT = Number(process.env.E2E_PREVIEW_PORT ?? 4173);
const API_URL = `http://127.0.0.1:${API_PORT}`;

/**
 * Браузерный слой проверок: Fastify и preview-сборка фронтенда, только Chromium,
 * один воркер и трейс на первом ретрае, чтобы разбирать падения по артефакту.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PREVIEW_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run start --workspace server",
      url: `${API_URL}/api/health`,
      env: { HOST: "127.0.0.1", PORT: String(API_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npm run preview --workspace web",
      url: `http://127.0.0.1:${PREVIEW_PORT}`,
      env: { PREVIEW_PORT: String(PREVIEW_PORT), API_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
