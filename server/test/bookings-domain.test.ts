import { describe, expect, it } from "vitest";
import { overlaps, parseUtcInstant } from "../src/domain/bookings.js";
import { isBookableStart } from "../src/domain/slots.js";

const base = { start: "2026-11-13T06:00:00.000Z", end: "2026-11-13T07:00:00.000Z" };

describe("пересечение интервалов", () => {
  it("не считает пересечением примыкание с обеих сторон", () => {
    expect(
      overlaps(base, { start: "2026-11-13T07:00:00.000Z", end: "2026-11-13T07:30:00.000Z" }),
    ).toBe(false);
    expect(
      overlaps(base, { start: "2026-11-13T05:30:00.000Z", end: "2026-11-13T06:00:00.000Z" }),
    ).toBe(false);
  });

  it("считает пересечением частичное наложение с любой стороны", () => {
    expect(
      overlaps(base, { start: "2026-11-13T06:30:00.000Z", end: "2026-11-13T07:30:00.000Z" }),
    ).toBe(true);
    expect(
      overlaps(base, { start: "2026-11-13T05:30:00.000Z", end: "2026-11-13T06:30:00.000Z" }),
    ).toBe(true);
  });

  it("считает пересечением полное совпадение и вложение", () => {
    expect(overlaps(base, base)).toBe(true);
    expect(
      overlaps(base, { start: "2026-11-13T06:15:00.000Z", end: "2026-11-13T06:45:00.000Z" }),
    ).toBe(true);
  });
});

describe("разбор момента UTC", () => {
  it.each([
    { value: "2026-11-13T06:00:00Z", expected: "2026-11-13T06:00:00.000Z" },
    { value: "2026-11-13T06:00:00.000Z", expected: "2026-11-13T06:00:00.000Z" },
  ])("принимает $value и приводит к каноническому виду", ({ value, expected }) => {
    expect(parseUtcInstant(value)).toBe(expected);
  });

  it.each([
    { title: "смещение вместо UTC", value: "2026-11-13T09:00:00+03:00" },
    { title: "строка без зоны", value: "2026-11-13T06:00:00" },
    { title: "ненулевые секунды", value: "2026-11-13T06:00:30Z" },
    { title: "ненулевые миллисекунды", value: "2026-11-13T06:00:00.500Z" },
    { title: "не строка", value: 1_760_000_000 },
  ])("отклоняет момент: $title", ({ value }) => {
    expect(parseUtcInstant(value)).toBeUndefined();
  });
});

describe("допустимость старта брони", () => {
  const now = new Date("2026-11-12T09:15:00.000Z");

  it("принимает старт из сетки в пределах окна и рабочих часов", () => {
    expect(isBookableStart("2026-11-13T06:00:00.000Z", 30, now)).toBe(true);
    expect(isBookableStart("2026-11-13T14:30:00.000Z", 30, now)).toBe(true);
  });

  it.each([
    { title: "не по сетке", start: "2026-11-13T06:15:00.000Z" },
    { title: "в выходной", start: "2026-11-14T06:00:00.000Z" },
    { title: "за окном", start: "2026-11-26T06:00:00.000Z" },
    { title: "в прошлом", start: "2026-11-12T06:00:00.000Z" },
    { title: "раньше рабочего дня", start: "2026-11-13T05:30:00.000Z" },
  ])("отклоняет старт: $title", ({ start }) => {
    expect(isBookableStart(start, 30, now)).toBe(false);
  });

  it("учитывает длительность: 60 минут не помещаются в старт 17:30", () => {
    expect(isBookableStart("2026-11-13T14:00:00.000Z", 60, now)).toBe(true);
    expect(isBookableStart("2026-11-13T14:30:00.000Z", 60, now)).toBe(false);
  });
});
