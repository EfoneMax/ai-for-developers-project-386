import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { ApiError, createMeetingType, listMeetingTypes } from "@/features/meeting-types/api";
import type { MeetingType } from "@/client/types.gen";

vi.mock("@/features/meeting-types/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/meeting-types/api")>();
  return {
    ...actual,
    listMeetingTypes: vi.fn<typeof actual.listMeetingTypes>(),
    createMeetingType: vi.fn<typeof actual.createMeetingType>(),
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
