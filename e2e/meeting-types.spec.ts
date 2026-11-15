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

test("владелец находит, правит и удаляет тип встречи, и тип исчезает со страницы записи", async ({
  page,
}) => {
  const name = `Правка ${Date.now()}`;
  const renamed = `${name} — обновлён`;

  await page.goto("/owner");

  await page.getByRole("button", { name: "Создать" }).click();
  const createDialog = page.getByRole("dialog", { name: "Новый тип встречи" });
  await createDialog.getByLabel("Название").fill(name);
  await createDialog.getByLabel("Длительность, мин").fill("40");
  await createDialog.getByRole("button", { name: "Сохранить" }).click();
  await expect(createDialog).toBeHidden();

  const search = page.getByLabel("Поиск");
  await search.fill("Правка");

  const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: `Действия: ${name}` }).click();
  await page.getByRole("menuitem", { name: "Изменить" }).click();

  const editDialog = page.getByRole("dialog", { name: "Изменить тип встречи" });
  await editDialog.getByLabel("Название").fill(renamed);
  await editDialog.getByLabel("Длительность, мин").fill("20");
  await editDialog.getByRole("button", { name: "Сохранить" }).click();
  await expect(editDialog).toBeHidden();

  const editedRow = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: renamed }) });
  await expect(editedRow.getByText("20 мин")).toBeVisible();

  await editedRow.getByRole("button", { name: `Действия: ${renamed}` }).click();
  await page.getByRole("menuitem", { name: "Удалить" }).click();

  const confirm = page.getByRole("alertdialog", { name: `Удалить тип «${renamed}»?` });
  await expect(
    confirm.getByText(/брони сохранятся и сохранят прежние название и длительность/),
  ).toBeVisible();
  await confirm.getByRole("button", { name: "Удалить" }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole("heading", { name: renamed })).toBeHidden();

  await page.goto("/book");
  await expect(page.getByRole("heading", { name: "Выберите тип встречи" })).toBeVisible();
  await expect(page.getByRole("heading", { name: renamed })).toBeHidden();
});
