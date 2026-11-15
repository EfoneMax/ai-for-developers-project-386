import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { listMeetingTypes } from "@/features/meeting-types/api";

vi.mock("@/features/meeting-types/api", () => ({
  listMeetingTypes: vi.fn<typeof import("@/features/meeting-types/api").listMeetingTypes>(),
  createMeetingType: vi.fn<typeof import("@/features/meeting-types/api").createMeetingType>(),
}));

const meetingType = {
  id: "2f4c62d8-4a52-4a51-9c62-27f1f4f1a111",
  name: "Созвон по проекту",
  description: "Обсудим сроки и объём работ",
  durationMinutes: 30,
  createdAt: "2026-11-12T09:00:00.000Z",
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("страница записи", () => {
  it("показывает карточки типов встреч с названием, описанием и длительностью", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({
      items: [meetingType],
      total: 1,
      page: 1,
      limit: 100,
    });

    renderAt("/book");

    expect(await screen.findByRole("heading", { name: "Созвон по проекту" })).toBeTruthy();
    expect(screen.getByText("Обсудим сроки и объём работ")).toBeTruthy();
    expect(screen.getByText("30 мин")).toBeTruthy();
  });

  it("показывает скелетоны, пока список грузится", () => {
    vi.mocked(listMeetingTypes).mockReturnValue(new Promise(() => {}));

    renderAt("/book");

    expect(screen.getByRole("status", { name: "Загружаем типы встреч" })).toBeTruthy();
  });

  it("показывает пустое состояние со ссылкой на главную", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });

    renderAt("/book");

    expect(await screen.findByText("Владелец ещё не создал ни одного типа встречи")).toBeTruthy();
    expect(screen.getByRole("link", { name: "На главную" })).toBeTruthy();
  });

  it("показывает ошибку загрузки и повторяет запрос по кнопке", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypes)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ items: [meetingType], total: 1, page: 1, limit: 100 });

    renderAt("/book");

    expect(await screen.findByText("Не удалось загрузить типы встреч")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("heading", { name: "Созвон по проекту" })).toBeTruthy();
  });
});
