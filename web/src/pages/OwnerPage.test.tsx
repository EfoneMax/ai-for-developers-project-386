import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import {
  createMeetingType,
  deleteMeetingType,
  listMeetingTypes,
  updateMeetingType,
} from "@/features/meeting-types/api";
import { listBookings } from "@/features/bookings/api";
import { ApiError } from "@/lib/api-error";
import type { Booking, MeetingType } from "@/client/types.gen";

import { cancelBooking } from "@/features/bookings/api";

vi.mock("@/features/bookings/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/bookings/api")>();
  return {
    ...actual,
    cancelBooking: vi.fn<typeof actual.cancelBooking>(),
    listBookings: vi.fn<typeof actual.listBookings>(),
    createBooking: vi.fn<typeof actual.createBooking>(),
  };
});

vi.mock("@/features/meeting-types/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/meeting-types/api")>();
  return {
    ...actual,
    listMeetingTypes: vi.fn<typeof actual.listMeetingTypes>(),
    createMeetingType: vi.fn<typeof actual.createMeetingType>(),
    updateMeetingType: vi.fn<typeof actual.updateMeetingType>(),
    deleteMeetingType: vi.fn<typeof actual.deleteMeetingType>(),
  };
});

const meetingType: MeetingType = {
  id: "6d1f8a42-1c4b-4f6e-9d0a-2b7c3e4f5a60",
  name: "Созвон по проекту",
  description: "Обсудим сроки и объём работ",
  durationMinutes: 45,
  createdAt: "2026-11-12T09:00:00.000Z",
};

const emptyPage = { items: [], total: 0, page: 1, limit: 100 };

function renderOwner() {
  return render(
    <MemoryRouter initialEntries={["/owner"]}>
      <App />
    </MemoryRouter>,
  );
}

async function openCreateDialog() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Создать" }));
  return user;
}

beforeEach(() => {
  vi.mocked(listBookings).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("кабинет владельца: список типов встреч", () => {
  it("показывает название, длительность и описание типа", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ ...emptyPage, items: [meetingType], total: 1 });

    renderOwner();

    expect(await screen.findByRole("heading", { name: "Созвон по проекту" })).toBeTruthy();
    expect(screen.getByText("Обсудим сроки и объём работ")).toBeTruthy();
    expect(screen.getByText("45 мин")).toBeTruthy();
  });

  it("показывает пустое состояние, пока нет ни одного типа", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue(emptyPage);

    renderOwner();

    expect(await screen.findByText("Пока нет типов встреч")).toBeTruthy();
  });

  it("показывает скелетоны, пока список грузится", () => {
    vi.mocked(listMeetingTypes).mockReturnValue(new Promise(() => {}));

    renderOwner();

    expect(screen.getByRole("status", { name: "Загружаем типы встреч" })).toBeTruthy();
  });

  it("показывает ошибку загрузки и повторяет запрос", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingTypes)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ...emptyPage, items: [meetingType], total: 1 });

    renderOwner();

    expect(await screen.findByText("Не удалось загрузить типы встреч")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("heading", { name: "Созвон по проекту" })).toBeTruthy();
  });
});

describe("кабинет владельца: поиск по типам встреч", () => {
  it("отправляет строку поиска в API с debounce, а не на каждое нажатие", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ ...emptyPage, items: [meetingType], total: 1 });
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    expect(listMeetingTypes).toHaveBeenCalledTimes(1);

    const search = screen.getByLabelText("Поиск");
    await user.type(search, "п");
    expect(listMeetingTypes).toHaveBeenCalledTimes(1);

    await user.type(search, "роект");
    await waitFor(() => {
      expect(listMeetingTypes).toHaveBeenLastCalledWith({ search: "проект" });
    });
  });

  it("показывает «Ничего не найдено», когда поиск не дал результатов", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue(emptyPage);
    const user = userEvent.setup();

    renderOwner();
    await screen.findByText("Пока нет типов встреч");
    await user.type(screen.getByLabelText("Поиск"), "отпуск");

    expect(await screen.findByText("Ничего не найдено")).toBeTruthy();
    expect(screen.queryByText("Пока нет типов встреч")).toBeNull();
  });
});

describe("кабинет владельца: создание типа встречи", () => {
  it("открывает диалог с полями формы", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue(emptyPage);

    renderOwner();
    await openCreateDialog();

    expect(screen.getByRole("dialog", { name: "Новый тип встречи" })).toBeTruthy();
    expect(screen.getByLabelText("Название")).toBeTruthy();
    expect(screen.getByLabelText("Описание")).toBeTruthy();
    expect(screen.getByLabelText("Длительность, мин")).toBeTruthy();
  });

  it("показывает ошибки полей и не отправляет неверную форму", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue(emptyPage);
    const user = userEvent.setup();

    renderOwner();
    await openCreateDialog();

    const duration = screen.getByLabelText<HTMLInputElement>("Длительность, мин");
    await user.clear(duration);
    await user.type(duration, "300");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByText("Укажите название")).toBeTruthy();
    expect(screen.getByText("Длительность — целое число от 5 до 240 минут")).toBeTruthy();
    expect(createMeetingType).not.toHaveBeenCalled();
  });

  it("создаёт тип, закрывает диалог и перезагружает список", async () => {
    vi.mocked(listMeetingTypes)
      .mockResolvedValueOnce(emptyPage)
      .mockResolvedValueOnce({ ...emptyPage, items: [meetingType], total: 1 });
    vi.mocked(createMeetingType).mockResolvedValue(meetingType);
    const user = userEvent.setup();

    renderOwner();
    await openCreateDialog();

    await user.type(screen.getByLabelText("Название"), "  Созвон по проекту  ");
    await user.type(screen.getByLabelText("Описание"), " Обсудим сроки и объём работ ");
    const duration = screen.getByLabelText("Длительность, мин");
    await user.clear(duration);
    await user.type(duration, "45");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(createMeetingType).toHaveBeenCalledWith({
      name: "Созвон по проекту",
      description: "Обсудим сроки и объём работ",
      durationMinutes: 45,
    });
    expect(await screen.findByRole("heading", { name: "Созвон по проекту" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("показывает серверные ошибки под полями и оставляет диалог открытым", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue(emptyPage);
    vi.mocked(createMeetingType).mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "Проверьте заполнение полей", [
        { field: "name", message: "Сервер: название слишком длинное" },
      ]),
    );
    const user = userEvent.setup();

    renderOwner();
    await openCreateDialog();

    await user.type(screen.getByLabelText("Название"), "Звонок");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Сервер: название слишком длинное")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Новый тип встречи" })).toBeTruthy();
  });

  it("блокирует кнопку на время запроса и не отправляет форму дважды", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue(emptyPage);
    vi.mocked(createMeetingType).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderOwner();
    await openCreateDialog();

    await user.type(screen.getByLabelText("Название"), "Звонок");
    const submit = screen.getByRole("button", { name: "Сохранить" });
    await user.click(submit);
    await user.click(submit);

    expect(submit.hasAttribute("disabled")).toBe(true);
    expect(createMeetingType).toHaveBeenCalledTimes(1);
  });
});

const upcomingBooking: Booking = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "confirmed",
  meetingType: {
    id: meetingType.id,
    name: meetingType.name,
    durationMinutes: 45,
  },
  start: "2026-11-13T06:00:00.000Z",
  end: "2026-11-13T06:45:00.000Z",
  guest: { name: "Анна Петрова", email: "anna@example.com", comment: "Обсудить сроки" },
};

async function openUpcomingTab() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("tab", { name: "Предстоящие встречи" }));
  return user;
}

describe("кабинет владельца: предстоящие встречи", () => {
  it("показывает две вкладки и открывает типы встреч по умолчанию", async () => {
    renderOwner();

    expect(await screen.findByRole("tab", { name: "Типы встреч" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Предстоящие встречи" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Типы встреч" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("показывает встречу с московским временем, снимком типа и контактами гостя", async () => {
    vi.mocked(listBookings).mockResolvedValue([upcomingBooking]);

    renderOwner();
    await openUpcomingTab();

    const row = (await screen.findByText("Анна Петрова")).closest("li");
    if (row === null) {
      throw new Error("Строка предстоящей встречи не найдена");
    }
    expect(within(row).getByText("пт, 13 ноября")).toBeTruthy();
    expect(within(row).getByText(/09:00–09:45/)).toBeTruthy();
    expect(within(row).getByText("Созвон по проекту")).toBeTruthy();
    expect(within(row).getByText("45 мин")).toBeTruthy();
    expect(within(row).getByText("Анна Петрова")).toBeTruthy();
    expect(within(row).getByText("anna@example.com")).toBeTruthy();
    expect(within(row).getByText("Обсудить сроки")).toBeTruthy();
    expect(screen.queryByText(upcomingBooking.id)).toBeNull();
  });

  it("показывает пустое состояние, когда предстоящих встреч нет", async () => {
    renderOwner();
    await openUpcomingTab();

    expect(await screen.findByText("Пока нет предстоящих встреч")).toBeTruthy();
  });

  it("показывает скелетоны, пока список встреч грузится", async () => {
    vi.mocked(listBookings).mockReturnValue(new Promise(() => {}));

    renderOwner();
    await openUpcomingTab();

    expect(screen.getByRole("status", { name: "Загружаем предстоящие встречи" })).toBeTruthy();
  });

  it("показывает ошибку загрузки и повторяет запрос", async () => {
    vi.mocked(listBookings)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([upcomingBooking]);

    renderOwner();
    const user = await openUpcomingTab();

    expect(await screen.findByText("Не удалось загрузить предстоящие встречи")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByText("Анна Петрова")).toBeTruthy();
  });
});

async function openRowActions(
  user: ReturnType<typeof userEvent.setup>,
  name = "Созвон по проекту",
) {
  await user.click(await screen.findByRole("button", { name: `Действия: ${name}` }));
}

describe("кабинет владельца: правка типа встречи", () => {
  it("открывает из меню строки диалог с заполненными полями", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ ...emptyPage, items: [meetingType], total: 1 });
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    await openRowActions(user);
    await user.click(await screen.findByRole("menuitem", { name: "Изменить" }));

    const dialog = await screen.findByRole("dialog", { name: "Изменить тип встречи" });
    expect(within(dialog).getByLabelText<HTMLInputElement>("Название").value).toBe(
      "Созвон по проекту",
    );
    expect(within(dialog).getByLabelText<HTMLTextAreaElement>("Описание").value).toBe(
      "Обсудим сроки и объём работ",
    );
    expect(within(dialog).getByLabelText<HTMLInputElement>("Длительность, мин").value).toBe("45");
  });

  it("сохраняет изменения и перезагружает каталог", async () => {
    const renamed = { ...meetingType, name: "Созвон по бюджету", durationMinutes: 60 };
    vi.mocked(listMeetingTypes)
      .mockResolvedValueOnce({ ...emptyPage, items: [meetingType], total: 1 })
      .mockResolvedValue({ ...emptyPage, items: [renamed], total: 1 });
    vi.mocked(updateMeetingType).mockResolvedValue(renamed);
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    await openRowActions(user);
    await user.click(await screen.findByRole("menuitem", { name: "Изменить" }));

    const dialog = await screen.findByRole("dialog", { name: "Изменить тип встречи" });
    const name = within(dialog).getByLabelText("Название");
    await user.clear(name);
    await user.type(name, "Созвон по бюджету");
    const duration = within(dialog).getByLabelText("Длительность, мин");
    await user.clear(duration);
    await user.type(duration, "60");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(updateMeetingType).toHaveBeenCalledWith(meetingType.id, {
      name: "Созвон по бюджету",
      description: "Обсудим сроки и объём работ",
      durationMinutes: 60,
    });
    expect(await screen.findByRole("heading", { name: "Созвон по бюджету" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("показывает серверные ошибки под полями и оставляет диалог открытым", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ ...emptyPage, items: [meetingType], total: 1 });
    vi.mocked(updateMeetingType).mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "Проверьте заполнение полей", [
        { field: "durationMinutes", message: "Сервер: длительность вне диапазона" },
      ]),
    );
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    await openRowActions(user);
    await user.click(await screen.findByRole("menuitem", { name: "Изменить" }));

    const dialog = await screen.findByRole("dialog", { name: "Изменить тип встречи" });
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await within(dialog).findByText("Сервер: длительность вне диапазона")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Изменить тип встречи" })).toBeTruthy();
  });

  it("сообщает, что тип уже удалён, и перезагружает каталог", async () => {
    vi.mocked(listMeetingTypes)
      .mockResolvedValueOnce({ ...emptyPage, items: [meetingType], total: 1 })
      .mockResolvedValue(emptyPage);
    vi.mocked(updateMeetingType).mockRejectedValue(
      new ApiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден"),
    );
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    await openRowActions(user);
    await user.click(await screen.findByRole("menuitem", { name: "Изменить" }));

    const dialog = await screen.findByRole("dialog", { name: "Изменить тип встречи" });
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Этот тип встречи уже удалён — каталог обновлён.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(listMeetingTypes).toHaveBeenCalledTimes(2);
  });
});

describe("кабинет владельца: удаление типа встречи", () => {
  async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
    await openRowActions(user);
    await user.click(await screen.findByRole("menuitem", { name: "Удалить" }));
    return screen.findByRole("alertdialog", { name: "Удалить тип «Созвон по проекту»?" });
  }

  it("предупреждает, что существующие брони сохранятся", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ ...emptyPage, items: [meetingType], total: 1 });
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    const dialog = await openDeleteDialog(user);

    expect(
      within(dialog).getByText(/брони сохранятся и сохранят прежние название и длительность/),
    ).toBeTruthy();
    expect(within(dialog).getByText(/исчезнет с публичной страницы/)).toBeTruthy();
  });

  it("удаляет тип, закрывает подтверждение и перезагружает каталог", async () => {
    vi.mocked(listMeetingTypes)
      .mockResolvedValueOnce({ ...emptyPage, items: [meetingType], total: 1 })
      .mockResolvedValue(emptyPage);
    vi.mocked(deleteMeetingType).mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    const dialog = await openDeleteDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));

    expect(deleteMeetingType).toHaveBeenCalledWith(meetingType.id);
    expect(await screen.findByText("Пока нет типов встреч")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(listMeetingTypes).toHaveBeenCalledTimes(2);
  });

  it("не удаляет тип, когда подтверждение отменяют", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ ...emptyPage, items: [meetingType], total: 1 });
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    const dialog = await openDeleteDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Отмена" }));

    expect(deleteMeetingType).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "Созвон по проекту" })).toBeTruthy();
  });

  it("сообщает, что тип уже удалён, и перезагружает каталог", async () => {
    vi.mocked(listMeetingTypes)
      .mockResolvedValueOnce({ ...emptyPage, items: [meetingType], total: 1 })
      .mockResolvedValue(emptyPage);
    vi.mocked(deleteMeetingType).mockRejectedValue(
      new ApiError("MEETING_TYPE_NOT_FOUND", "Тип встречи не найден"),
    );
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    const dialog = await openDeleteDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));

    expect(await screen.findByText("Этот тип встречи уже удалён — каталог обновлён.")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(listMeetingTypes).toHaveBeenCalledTimes(2);
  });

  it("оставляет подтверждение открытым и показывает сетевую ошибку", async () => {
    vi.mocked(listMeetingTypes).mockResolvedValue({ ...emptyPage, items: [meetingType], total: 1 });
    vi.mocked(deleteMeetingType).mockRejectedValue(
      new ApiError("NETWORK_ERROR", "Не удалось связаться с сервером"),
    );
    const user = userEvent.setup();

    renderOwner();
    await screen.findByRole("heading", { name: "Созвон по проекту" });
    const dialog = await openDeleteDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));

    expect(await within(dialog).findByRole("alert")).toBeTruthy();
    expect(within(dialog).getByText("Не удалось связаться с сервером")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});

describe("кабинет владельца: отмена встречи", () => {
  async function openCancelDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      await screen.findByRole("button", {
        name: `Действия: встреча с ${upcomingBooking.guest.name}`,
      }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Отменить" }));

    return screen.findByRole("alertdialog", {
      name: `Отменить встречу с ${upcomingBooking.guest.name}?`,
    });
  }

  it("открывает подтверждение из меню строки и объясняет последствия отмены", async () => {
    vi.mocked(listBookings).mockResolvedValue([upcomingBooking]);
    const user = userEvent.setup();

    renderOwner();
    await openUpcomingTab();
    const dialog = await openCancelDialog(user);

    expect(within(dialog).getByText(/снова появится на странице записи/)).toBeTruthy();
    expect(within(dialog).getByText(/Бронь сохранится в статусе «отменена»/)).toBeTruthy();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("не отменяет встречу, когда подтверждение закрывают", async () => {
    vi.mocked(listBookings).mockResolvedValue([upcomingBooking]);
    const user = userEvent.setup();

    renderOwner();
    await openUpcomingTab();
    const dialog = await openCancelDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Отмена" }));

    expect(cancelBooking).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText("Анна Петрова")).toBeTruthy();
  });

  it("отменяет встречу, убирает строку и перезагружает список", async () => {
    vi.mocked(listBookings).mockResolvedValueOnce([upcomingBooking]).mockResolvedValueOnce([]);
    vi.mocked(cancelBooking).mockResolvedValue({
      ...upcomingBooking,
      status: "cancelled",
    });
    const user = userEvent.setup();

    renderOwner();
    await openUpcomingTab();
    const dialog = await openCancelDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Отменить" }));

    expect(cancelBooking).toHaveBeenCalledWith(upcomingBooking.id);
    expect(await screen.findByText("Пока нет предстоящих встреч")).toBeTruthy();
    expect(screen.queryByText("Анна Петрова")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(listBookings).toHaveBeenCalledTimes(2);
  });

  it("блокирует кнопку подтверждения на время запроса", async () => {
    vi.mocked(listBookings).mockResolvedValue([upcomingBooking]);
    vi.mocked(cancelBooking).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderOwner();
    await openUpcomingTab();
    const dialog = await openCancelDialog(user);
    const confirm = within(dialog).getByRole("button", { name: "Отменить" });
    await user.click(confirm);
    await user.click(confirm);

    expect(confirm.hasAttribute("disabled")).toBe(true);
    expect(cancelBooking).toHaveBeenCalledTimes(1);
  });

  it("сообщает, что встречу уже нельзя отменить, и перезагружает список", async () => {
    vi.mocked(listBookings).mockResolvedValueOnce([upcomingBooking]).mockResolvedValue([]);
    vi.mocked(cancelBooking).mockRejectedValue(
      new ApiError("BOOKING_NOT_CANCELLABLE", "Эту встречу уже нельзя отменить"),
    );
    const user = userEvent.setup();

    renderOwner();
    await openUpcomingTab();
    const dialog = await openCancelDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Отменить" }));

    expect(
      await screen.findByText("Эту встречу уже нельзя отменить — список обновлён."),
    ).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(listBookings).toHaveBeenCalledTimes(2);
  });

  it("оставляет подтверждение открытым и показывает сетевую ошибку", async () => {
    vi.mocked(listBookings).mockResolvedValue([upcomingBooking]);
    vi.mocked(cancelBooking).mockRejectedValue(
      new ApiError("NETWORK_ERROR", "Не удалось связаться с сервером"),
    );
    const user = userEvent.setup();

    renderOwner();
    await openUpcomingTab();
    const dialog = await openCancelDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Отменить" }));

    expect(await within(dialog).findByRole("alert")).toBeTruthy();
    expect(within(dialog).getByText("Не удалось связаться с сервером")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
