import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import BookingPage from "./BookingPage";
import { listMeetingTypes } from "@/features/meeting-types/api";
import { listMeetingTypeSlots } from "@/features/slots/api";

vi.mock("@/features/meeting-types/api", () => ({
  listMeetingTypes: vi.fn<typeof import("@/features/meeting-types/api").listMeetingTypes>(),
  createMeetingType: vi.fn<typeof import("@/features/meeting-types/api").createMeetingType>(),
}));

vi.mock("@/features/slots/api", () => ({
  listMeetingTypeSlots: vi.fn<typeof import("@/features/slots/api").listMeetingTypeSlots>(),
}));

const meetingType = {
  id: "2f4c62d8-4a52-4a51-9c62-27f1f4f1a111",
  name: "Созвон по проекту",
  description: "Обсудим сроки и объём работ",
  durationMinutes: 30,
  createdAt: "2026-11-12T09:00:00.000Z",
};

/** Четверг, 12:15 по Москве: окно 12–25 ноября 2026. */
const NOW = new Date("2026-11-12T09:15:00Z");

/** Слоты только на 12 и 13 ноября: остальные дни окна пусты. */
const slots = [
  { start: "2026-11-12T10:00:00.000Z", end: "2026-11-12T10:30:00.000Z" },
  { start: "2026-11-12T10:30:00.000Z", end: "2026-11-12T11:00:00.000Z" },
  { start: "2026-11-13T06:00:00.000Z", end: "2026-11-13T06:30:00.000Z" },
];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function renderBookingPage() {
  return render(
    <MemoryRouter initialEntries={["/book"]}>
      <BookingPage now={() => NOW} />
    </MemoryRouter>,
  );
}

async function chooseMeetingType(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Выбрать время: Созвон по проекту" }));
}

function dayGroup() {
  return within(screen.getByRole("group", { name: "День" }));
}

function timeGroup() {
  return within(screen.getByRole("group", { name: "Время" }));
}

beforeEach(() => {
  window.localStorage.setItem("call-booking:time-zone", "Europe/Moscow");
  vi.mocked(listMeetingTypes).mockResolvedValue({
    items: [meetingType],
    total: 1,
    page: 1,
    limit: 100,
  });
  vi.mocked(listMeetingTypeSlots).mockResolvedValue(slots);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
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

describe("шаг выбора дня и слота", () => {
  it("показывает все 14 дат окна и длительность выбранного типа", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await chooseMeetingType(user);

    expect(screen.getByRole("heading", { name: "Выберите день и время" })).toBeTruthy();
    expect(screen.getByText("30 мин")).toBeTruthy();
    expect(dayGroup().getAllByRole("button")).toHaveLength(14);
    expect(dayGroup().getByText("чт, 12 нояб.")).toBeTruthy();
    expect(dayGroup().getByText("ср, 25 нояб.")).toBeTruthy();
  });

  it("делает выходные и дни без слотов неактивными, но не скрывает их", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await chooseMeetingType(user);

    const buttons = dayGroup().getAllByRole("button");
    const findDay = (label: string) =>
      buttons.find((button) => button.textContent?.includes(label));

    expect(findDay("14 нояб.")?.hasAttribute("disabled")).toBe(true);
    expect(findDay("16 нояб.")?.hasAttribute("disabled")).toBe(true);
    expect(findDay("12 нояб.")?.hasAttribute("disabled")).toBe(false);
    expect(findDay("13 нояб.")?.hasAttribute("disabled")).toBe(false);
  });

  it("раскрывает свободные слоты выбранного дня в поясе гостя", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await chooseMeetingType(user);
    expect(screen.queryByRole("group", { name: "Время" })).toBeNull();

    await user.click(dayGroup().getByText("чт, 12 нояб."));

    expect(timeGroup().getByRole("button", { name: "13:00" })).toBeTruthy();
    expect(timeGroup().getByRole("button", { name: "13:30" })).toBeTruthy();
    expect(screen.getByTestId("guest-time-zone").textContent).toBe("Europe/Moscow");
  });

  it("переключает пояс без сброса выбранного слота и запоминает выбор", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await chooseMeetingType(user);
    await user.click(dayGroup().getByText("чт, 12 нояб."));
    await user.click(timeGroup().getByRole("button", { name: "13:00" }));

    expect(timeGroup().getByRole("button", { name: "13:00" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    await user.selectOptions(screen.getByLabelText("Часовой пояс"), "Europe/Berlin");

    expect(screen.queryByRole("button", { name: "13:00" })).toBeNull();
    expect(timeGroup().getByRole("button", { name: "11:00" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByTestId("guest-time-zone").textContent).toBe("Europe/Berlin");
    expect(window.localStorage.getItem("call-booking:time-zone")).toBe("Europe/Berlin");
  });

  it("показывает сохранённый пояс при открытии страницы", async () => {
    window.localStorage.setItem("call-booking:time-zone", "Europe/Berlin");
    const user = userEvent.setup();
    renderBookingPage();

    await chooseMeetingType(user);
    await user.click(dayGroup().getByText("чт, 12 нояб."));

    expect(timeGroup().getByRole("button", { name: "11:00" })).toBeTruthy();
    expect((screen.getByLabelText("Часовой пояс") as HTMLSelectElement).value).toBe(
      "Europe/Berlin",
    );
  });

  it("показывает скелетоны, пока слоты грузятся", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypeSlots).mockReturnValue(new Promise(() => {}));
    renderBookingPage();

    await chooseMeetingType(user);

    expect(screen.getByRole("status", { name: "Загружаем слоты" })).toBeTruthy();
  });

  it("показывает сообщение вместо календаря, если свободных слотов нет во всём окне", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypeSlots).mockResolvedValue([]);
    renderBookingPage();

    await chooseMeetingType(user);

    expect(await screen.findByText("Свободных слотов нет")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "День" })).toBeNull();
  });

  it("показывает ошибку загрузки слотов и повторяет запрос", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypeSlots)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(slots);
    renderBookingPage();

    await chooseMeetingType(user);

    expect(await screen.findByText("Не удалось загрузить слоты")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("group", { name: "День" })).toBeTruthy();
  });

  it("возвращает к выбору типа по кнопке «Назад»", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await chooseMeetingType(user);
    await user.click(screen.getByRole("button", { name: "Назад к типам" }));

    expect(screen.getByRole("heading", { name: "Выберите тип встречи" })).toBeTruthy();
  });
});
