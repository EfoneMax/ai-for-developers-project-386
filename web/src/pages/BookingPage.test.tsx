import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import BookingPage from "./BookingPage";
import { listMeetingTypes } from "@/features/meeting-types/api";
import { createBooking } from "@/features/bookings/api";
import { ApiError } from "@/lib/api-error";
import { listMeetingTypeSlots } from "@/features/slots/api";

vi.mock("@/features/meeting-types/api", () => ({
  listMeetingTypes: vi.fn<typeof import("@/features/meeting-types/api").listMeetingTypes>(),
  createMeetingType: vi.fn<typeof import("@/features/meeting-types/api").createMeetingType>(),
}));

vi.mock("@/features/slots/api", () => ({
  listMeetingTypeSlots: vi.fn<typeof import("@/features/slots/api").listMeetingTypeSlots>(),
}));

vi.mock("@/features/bookings/api", () => ({
  createBooking: vi.fn<typeof import("@/features/bookings/api").createBooking>(),
  listBookings: vi.fn<typeof import("@/features/bookings/api").listBookings>(),
}));

const meetingType = {
  id: "2f4c62d8-4a52-4a51-9c62-27f1f4f1a111",
  name: "Созвон по проекту",
  description: "Обсудим сроки и объём работ",
  durationMinutes: 30,
  createdAt: "2026-11-12T09:00:00.000Z",
};

/** Московские даты окна, которые возвращает сервер: 12–25 ноября 2026. */
const windowDays = Array.from({ length: 14 }, (_, index) =>
  new Date(Date.UTC(2026, 10, 12 + index)).toISOString().slice(0, 10),
);

/** Слоты только на 12 и 13 ноября: остальные дни окна пусты. */
const slots = [
  { start: "2026-11-12T10:00:00.000Z", end: "2026-11-12T10:30:00.000Z" },
  { start: "2026-11-12T10:30:00.000Z", end: "2026-11-12T11:00:00.000Z" },
  { start: "2026-11-13T06:00:00.000Z", end: "2026-11-13T06:30:00.000Z" },
];

function slotsResponse(list = slots, days = windowDays) {
  return { slots: list, windowDays: days };
}

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
      <BookingPage />
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
  vi.mocked(listMeetingTypeSlots).mockResolvedValue(slotsResponse());
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
    vi.mocked(listMeetingTypeSlots).mockResolvedValue(slotsResponse([]));
    renderBookingPage();

    await chooseMeetingType(user);

    expect(await screen.findByText("Свободных слотов нет")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "День" })).toBeNull();
  });

  it("показывает ошибку загрузки слотов и повторяет запрос", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypeSlots)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(slotsResponse());
    renderBookingPage();

    await chooseMeetingType(user);

    expect(await screen.findByText("Не удалось загрузить слоты")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("group", { name: "День" })).toBeTruthy();
  });

  it("возвращает к списку типов с сообщением, если тип встречи исчез", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypeSlots).mockRejectedValue(
      new ApiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден"),
    );
    renderBookingPage();

    await chooseMeetingType(user);

    expect(await screen.findByRole("heading", { name: "Выберите тип встречи" })).toBeTruthy();
    expect(screen.getByText(/тип встречи больше недоступен/i)).toBeTruthy();
    expect(screen.queryByText("Не удалось загрузить слоты")).toBeNull();
  });

  it("строит календарь по датам окна из ответа сервера", async () => {
    const user = userEvent.setup();
    const serverDays = Array.from({ length: 14 }, (_, index) =>
      new Date(Date.UTC(2026, 10, 10 + index)).toISOString().slice(0, 10),
    );
    vi.mocked(listMeetingTypeSlots).mockResolvedValue(slotsResponse(slots, serverDays));
    renderBookingPage();

    await chooseMeetingType(user);

    await waitFor(() => {
      expect(dayGroup().getAllByRole("button")).toHaveLength(14);
    });
    expect(dayGroup().getByText("вт, 10 нояб.")).toBeTruthy();
    expect(dayGroup().queryByText("25 нояб.")).toBeNull();
  });

  it("возвращает к выбору типа по кнопке «Назад»", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await chooseMeetingType(user);
    await user.click(screen.getByRole("button", { name: "Назад к типам" }));

    expect(screen.getByRole("heading", { name: "Выберите тип встречи" })).toBeTruthy();
  });
});

const booking = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "confirmed" as const,
  meetingType: {
    id: meetingType.id,
    name: meetingType.name,
    durationMinutes: meetingType.durationMinutes,
  },
  start: "2026-11-12T10:00:00.000Z",
  end: "2026-11-12T10:30:00.000Z",
  guest: { name: "Анна", email: "anna@example.com", comment: "Позвонить заранее" },
};

async function goToContacts(user: ReturnType<typeof userEvent.setup>) {
  await chooseMeetingType(user);
  await user.click(dayGroup().getByText("чт, 12 нояб."));
  await user.click(timeGroup().getByRole("button", { name: "13:00" }));
  await user.click(screen.getByRole("button", { name: "Продолжить" }));
}

async function fillContacts(
  user: ReturnType<typeof userEvent.setup>,
  values: { name?: string; email?: string; comment?: string } = {},
) {
  await user.type(screen.getByLabelText("Имя"), values.name ?? "Анна");
  await user.type(screen.getByLabelText("Email"), values.email ?? "anna@example.com");
  if (values.comment !== undefined) {
    await user.type(screen.getByLabelText("Комментарий"), values.comment);
  }
}

async function submitContacts(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Подтвердить запись" }));
}

describe("шаг контактов и подтверждение", () => {
  it("открывает форму контактов после выбора слота", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await goToContacts(user);

    expect(screen.getByRole("heading", { name: "Оставьте контакты" })).toBeTruthy();
    expect(screen.getByLabelText("Имя")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Комментарий")).toBeTruthy();
    expect(screen.getByText(/13:00–13:30/)).toBeTruthy();
  });

  it("показывает экран подтверждения с датой, типом и контактами без номера брони", async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue(booking);
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user, { comment: "Позвонить заранее" });
    await submitContacts(user);

    expect(await screen.findByRole("heading", { name: "Вы записаны" })).toBeTruthy();
    expect(createBooking).toHaveBeenCalledWith({
      meetingTypeId: meetingType.id,
      start: "2026-11-12T10:00:00.000Z",
      guest: {
        name: "Анна",
        email: "anna@example.com",
        comment: "Позвонить заранее",
      },
    });
    expect(screen.getByTestId("confirmation-date").textContent).toBe("четверг, 12 ноября 2026");
    expect(screen.getByText(/13:00–13:30/)).toBeTruthy();
    expect(screen.getByTestId("confirmation-time-zone").textContent).toBe("Europe/Moscow");
    expect(screen.getByText("Созвон по проекту")).toBeTruthy();
    expect(screen.getByText("30 мин")).toBeTruthy();
    expect(screen.getByText("anna@example.com")).toBeTruthy();
    expect(screen.getByText(/только владелец/i)).toBeTruthy();
    expect(screen.queryByText(booking.id)).toBeNull();
  });

  it("показывает время на подтверждении в поясе гостя", async () => {
    window.localStorage.setItem("call-booking:time-zone", "Europe/Berlin");
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue(booking);
    renderBookingPage();

    await chooseMeetingType(user);
    await user.click(dayGroup().getByText("чт, 12 нояб."));
    await user.click(timeGroup().getByRole("button", { name: "11:00" }));
    await user.click(screen.getByRole("button", { name: "Продолжить" }));
    await fillContacts(user);
    await submitContacts(user);

    expect(await screen.findByRole("heading", { name: "Вы записаны" })).toBeTruthy();
    expect(screen.getByText(/11:00–11:30/)).toBeTruthy();
    expect(screen.getByTestId("confirmation-time-zone").textContent).toBe("Europe/Berlin");
  });

  it("проверяет обязательные поля и формат email до запроса", async () => {
    const user = userEvent.setup();
    renderBookingPage();

    await goToContacts(user);
    await submitContacts(user);

    expect(screen.getByText("Укажите имя")).toBeTruthy();
    expect(screen.getByText("Укажите email")).toBeTruthy();
    expect(createBooking).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Имя"), "Анна");
    await user.type(screen.getByLabelText("Email"), "anna@");
    await submitContacts(user);

    expect(screen.getByText("Укажите email вида name@example.com")).toBeTruthy();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("раскладывает серверные details по полям формы", async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "Проверьте заполнение полей", [
        { field: "email", message: "Сервер: email занят" },
      ]),
    );
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user);
    await submitContacts(user);

    expect(await screen.findByText("Сервер: email занят")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Оставьте контакты" })).toBeTruthy();
  });

  it("блокирует кнопку на время запроса и не отправляет бронь дважды", async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockReturnValue(new Promise(() => {}));
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user);

    const submit = screen.getByRole("button", { name: "Подтвердить запись" });
    await user.click(submit);
    await user.click(submit);

    expect(submit.hasAttribute("disabled")).toBe(true);
    expect(createBooking).toHaveBeenCalledTimes(1);
  });

  it("при занятом слоте показывает баннер, обновляет слоты и сохраняет контакты", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypeSlots)
      .mockResolvedValueOnce(slotsResponse())
      .mockResolvedValueOnce(slotsResponse([slots[2]!]));
    vi.mocked(createBooking).mockRejectedValue(
      new ApiError("SLOT_TAKEN", "Это время только что заняли"),
    );
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user, { comment: "Позвонить заранее" });
    await submitContacts(user);

    expect(await screen.findByText(/это время только что заняли/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Выберите день и время" })).toBeTruthy();
    expect(listMeetingTypeSlots).toHaveBeenCalledTimes(2);

    await user.click(dayGroup().getByText("пт, 13 нояб."));
    await user.click(timeGroup().getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect((screen.getByLabelText("Имя") as HTMLInputElement).value).toBe("Анна");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("anna@example.com");
    expect((screen.getByLabelText("Комментарий") as HTMLTextAreaElement).value).toBe(
      "Позвонить заранее",
    );
  });

  it("считает истёкший старт таким же конфликтом, как занятый слот", async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "Проверьте заполнение полей", [
        { field: "start", message: "Это время недоступно для записи" },
      ]),
    );
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user);
    await submitContacts(user);

    expect(await screen.findByText(/это время только что заняли/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Выберите день и время" })).toBeTruthy();
  });

  it("возвращает к списку типов, если тип встречи исчез", async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockRejectedValue(
      new ApiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден"),
    );
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user);
    await submitContacts(user);

    expect(await screen.findByRole("heading", { name: "Выберите тип встречи" })).toBeTruthy();
    expect(screen.getByText(/тип встречи больше недоступен/i)).toBeTruthy();
  });

  it("при сетевой ошибке показывает баннер с повтором и не повторяет запрос сам", async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking)
      .mockRejectedValueOnce(new ApiError("NETWORK_ERROR", "Не удалось связаться с сервером"))
      .mockResolvedValueOnce(booking);
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user);
    await submitContacts(user);

    expect(await screen.findByText(/не удалось связаться с сервером/i)).toBeTruthy();
    expect(createBooking).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("heading", { name: "Вы записаны" })).toBeTruthy();
    expect(createBooking).toHaveBeenCalledTimes(2);
  });

  it("сбрасывает поток к выбору типа по кнопке «Записаться ещё»", async () => {
    const user = userEvent.setup();
    vi.mocked(createBooking).mockResolvedValue(booking);
    renderBookingPage();

    await goToContacts(user);
    await fillContacts(user);
    await submitContacts(user);
    await user.click(await screen.findByRole("button", { name: "Записаться ещё" }));

    expect(screen.getByRole("heading", { name: "Выберите тип встречи" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Вы записаны" })).toBeNull();
  });
});
