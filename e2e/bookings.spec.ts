import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_URL = `http://127.0.0.1:${process.env.E2E_API_PORT ?? 3000}`;

interface Slot {
  start: string;
  end: string;
}

async function createMeetingType(
  request: APIRequestContext,
  name: string,
  durationMinutes = 30,
): Promise<{ id: string; name: string }> {
  const response = await request.post(`${API_URL}/api/meeting-types`, {
    data: { name, durationMinutes },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string; name: string };
}

async function listSlots(request: APIRequestContext, meetingTypeId: string): Promise<Slot[]> {
  const response = await request.get(`${API_URL}/api/meeting-types/${meetingTypeId}/slots`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { slots: Slot[] }).slots;
}

/** Московская дата момента: пояс владельца постоянный, UTC+3. */
function moscowDate(instant: string): string {
  return new Date(Date.parse(instant) + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Индекс дня в окне записи считаем от сегодняшней московской даты. */
function dayIndex(instant: string): number {
  const today = moscowDate(new Date().toISOString());
  const target = moscowDate(instant);

  return Math.round(
    (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / (24 * 60 * 60 * 1000),
  );
}

/**
 * Берёт слот на третьей свободной московской дате окна: так тест не зависит
 * от того, сколько сегодняшних стартов уже прошло.
 */
function stableSlot(slots: Slot[]): Slot {
  const byDay = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = moscowDate(slot.start);
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }

  const days = [...byDay.values()];
  const day = days[Math.min(2, days.length - 1)];
  if (day === undefined || day[0] === undefined) {
    throw new Error("У типа встречи нет свободных слотов для сценария");
  }

  return day[0];
}

async function openMeetingType(page: Page, name: string, slot: Slot): Promise<void> {
  await page.goto("/book");
  await page.getByRole("button", { name: `Выбрать время: ${name}` }).click();

  const dayButton = page
    .getByRole("group", { name: "День" })
    .getByRole("button")
    .nth(dayIndex(slot.start));
  await expect(dayButton).toBeEnabled();
  await dayButton.click();

  await page.getByRole("group", { name: "Время" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Продолжить" }).click();
}

async function fillGuest(page: Page, guest: { name: string; email: string; comment: string }) {
  await page.getByLabel("Имя").fill(guest.name);
  await page.getByLabel("Email").fill(guest.email);
  await page.getByLabel("Комментарий").fill(guest.comment);
}

test.describe("гость в другом часовом поясе", () => {
  test.use({ timezoneId: "Europe/Berlin" });

  test("гость бронирует слот, а владелец видит встречу в московском времени", async ({
    page,
    request,
  }) => {
    const stamp = Date.now();
    const meetingType = await createMeetingType(request, `Созвон ${stamp}`, 45);
    const slot = stableSlot(await listSlots(request, meetingType.id));
    const guest = {
      name: `Анна ${stamp}`,
      email: `anna+${stamp}@example.com`,
      comment: `Обсудить проект ${stamp}`,
    };

    await openMeetingType(page, meetingType.name, slot);
    await fillGuest(page, guest);
    await page.getByRole("button", { name: "Подтвердить запись" }).click();

    await expect(page.getByRole("heading", { name: "Вы записаны" })).toBeVisible();
    await expect(page.getByTestId("confirmation-time-zone")).toHaveText("Europe/Berlin");
    await expect(page.getByText(guest.name)).toBeVisible();
    await expect(page.getByText(guest.email)).toBeVisible();

    await page.goto("/owner");
    await page.getByRole("tab", { name: "Предстоящие встречи" }).click();

    const row = page.getByRole("listitem").filter({ hasText: guest.name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(meetingType.name);
    await expect(row).toContainText("45 мин");
    await expect(row).toContainText(guest.email);
    await expect(row).toContainText(guest.comment);
    await expect(row).toContainText(/\d{2}:\d{2}–\d{2}:\d{2}/);

    await page.getByRole("button", { name: `Действия: встреча с ${guest.name}` }).click();
    await page.getByRole("menuitem", { name: "Отменить" }).click();

    const confirmation = page.getByRole("alertdialog", {
      name: `Отменить встречу с ${guest.name}?`,
    });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Отменить" }).click();

    await expect(confirmation).toHaveCount(0);
    await expect(row).toHaveCount(0);

    const freedSlots = await listSlots(request, meetingType.id);
    expect(freedSlots.map((freed) => freed.start)).toContain(slot.start);
  });
});

test("гость пытается занять только что занятый слот и сохраняет контакты", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const meetingType = await createMeetingType(request, `Конфликт ${stamp}`);
  const slots = await listSlots(request, meetingType.id);
  const slot = stableSlot(slots);
  const guest = {
    name: `Борис ${stamp}`,
    email: `boris+${stamp}@example.com`,
    comment: `Комментарий ${stamp}`,
  };

  await openMeetingType(page, meetingType.name, slot);
  await fillGuest(page, guest);

  const response = await request.post(`${API_URL}/api/bookings`, {
    data: {
      meetingTypeId: meetingType.id,
      start: slot.start,
      guest: { name: `Другой гость ${stamp}`, email: `other+${stamp}@example.com` },
    },
  });
  expect(response.status()).toBe(201);

  await page.getByRole("button", { name: "Подтвердить запись" }).click();

  await expect(page.getByText(/это время только что заняли/i)).toBeVisible();
  await expect(page.getByRole("group", { name: "День" })).toBeVisible();

  const nextSlot = stableSlot(await listSlots(request, meetingType.id));
  const dayButton = page
    .getByRole("group", { name: "День" })
    .getByRole("button")
    .nth(dayIndex(nextSlot.start));
  await dayButton.click();
  await page.getByRole("group", { name: "Время" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Продолжить" }).click();

  await expect(page.getByLabel("Имя")).toHaveValue(guest.name);
  await expect(page.getByLabel("Email")).toHaveValue(guest.email);
  await expect(page.getByLabel("Комментарий")).toHaveValue(guest.comment);
});
