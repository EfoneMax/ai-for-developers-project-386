import { expect, test } from "@playwright/test";

test("владелец создаёт тип встречи и гость видит его на странице записи", async ({ page }) => {
  const name = `Созвон ${Date.now()}`;
  const description = "Сквозной сценарий: от кабинета до страницы записи";

  await page.goto("/owner");

  await expect(page.getByRole("heading", { name: "Типы встреч" })).toBeVisible();

  await page.getByRole("button", { name: "Создать" }).click();
  const dialog = page.getByRole("dialog", { name: "Новый тип встречи" });
  await dialog.getByLabel("Название").fill(name);
  await dialog.getByLabel("Описание").fill(description);
  await dialog.getByLabel("Длительность, мин").fill("40");
  await dialog.getByRole("button", { name: "Сохранить" }).click();

  await expect(dialog).toBeHidden();
  const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });
  await expect(row.getByText("40 мин")).toBeVisible();

  await page.goto("/book");

  await expect(page.getByRole("heading", { name: "Выберите тип встречи" })).toBeVisible();
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });
  await expect(card.getByText(description)).toBeVisible();
  await expect(card.getByText("40 мин")).toBeVisible();
});
