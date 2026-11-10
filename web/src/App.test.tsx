import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const entryPoints = [
  { section: "header", scope: "banner", name: "Записаться" },
  { section: "hero", scope: "main", name: "Записаться" },
  { section: "final", scope: "main", name: "Выбрать время" },
] as const;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("landing page", () => {
  it("opens at the root URL and describes the service", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { name: "Запись на звонок без переписки" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Как это работает" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Правила записи" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Календарь звонков" })).toBeTruthy();
  });

  it.each(entryPoints)(
    "leads from the $section call to action to the booking page",
    async ({ scope, name }) => {
      const user = userEvent.setup();
      renderAt("/");

      await user.click(within(screen.getByRole(scope)).getByRole("link", { name }));

      expect(screen.getByRole("heading", { name: "Страница записи скоро появится" })).toBeTruthy();
    },
  );

  it("opens the booking page directly at /book", () => {
    renderAt("/book");

    expect(screen.getByRole("heading", { name: "Страница записи скоро появится" })).toBeTruthy();
  });

  it("returns from the booking page to the landing page", async () => {
    const user = userEvent.setup();
    renderAt("/book");

    await user.click(screen.getByRole("link", { name: "На главную" }));

    expect(screen.getByRole("heading", { name: "Запись на звонок без переписки" })).toBeTruthy();
  });

  it("does not call the API on the landing page", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
