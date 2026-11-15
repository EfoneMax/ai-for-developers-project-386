import { describe, expect, it } from "vitest";
import { bookingWindowDays, generateSlots } from "../src/domain/slots.js";

/** Московская дата момента: пояс владельца — постоянный UTC+3. */
function moscowDate(instant: string): string {
  return new Date(new Date(instant).getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe("сетка слотов", () => {
  it("ставит старты через 30 минут от 09:00 по Москве и заканчивает встречу к 18:00", () => {
    const slots = generateSlots(30, new Date("2026-11-12T00:00:00Z"));
    const firstDay = slots.filter((slot) => moscowDate(slot.start) === "2026-11-12");

    expect(firstDay[0]).toEqual({
      start: "2026-11-12T06:00:00.000Z",
      end: "2026-11-12T06:30:00.000Z",
    });
    expect(firstDay[1]).toEqual({
      start: "2026-11-12T06:30:00.000Z",
      end: "2026-11-12T07:00:00.000Z",
    });
    expect(firstDay.at(-1)).toEqual({
      start: "2026-11-12T14:30:00.000Z",
      end: "2026-11-12T15:00:00.000Z",
    });
  });

  it("покрывает 14 московских дат и не предлагает выходные", () => {
    const slots = generateSlots(30, new Date("2026-11-12T00:00:00Z"));

    const days = [...new Set(slots.map((slot) => moscowDate(slot.start)))];

    expect(days).toEqual([
      "2026-11-12",
      "2026-11-13",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
    ]);
  });

  it("не предлагает сегодняшние старты, которые уже прошли", () => {
    const slots = generateSlots(30, new Date("2026-11-12T09:15:00Z"));
    const today = slots.filter((slot) => moscowDate(slot.start) === "2026-11-12");

    expect(today[0]?.start).toBe("2026-11-12T09:30:00.000Z");
  });

  it("не предлагает старт, совпадающий с текущим моментом", () => {
    const slots = generateSlots(30, new Date("2026-11-12T06:00:00Z"));
    const today = slots.filter((slot) => moscowDate(slot.start) === "2026-11-12");

    expect(today[0]?.start).toBe("2026-11-12T06:30:00.000Z");
  });

  it("включает сегодняшний старт, который ещё не наступил: буфера нет", () => {
    const slots = generateSlots(30, new Date("2026-11-12T05:59:00Z"));
    const today = slots.filter((slot) => moscowDate(slot.start) === "2026-11-12");

    expect(today[0]?.start).toBe("2026-11-12T06:00:00.000Z");
  });

  it.each([
    { durationMinutes: 5, lastStart: "2026-11-13T14:30:00.000Z" },
    { durationMinutes: 20, lastStart: "2026-11-13T14:30:00.000Z" },
    { durationMinutes: 45, lastStart: "2026-11-13T14:00:00.000Z" },
    { durationMinutes: 60, lastStart: "2026-11-13T14:00:00.000Z" },
    { durationMinutes: 240, lastStart: "2026-11-13T11:00:00.000Z" },
  ])(
    "для встречи на $durationMinutes минут последний старт дня — $lastStart",
    ({ durationMinutes, lastStart }) => {
      const slots = generateSlots(durationMinutes, new Date("2026-11-12T15:00:00Z"));
      const day = slots.filter((slot) => moscowDate(slot.start) === "2026-11-13");

      expect(day.at(-1)?.start).toBe(lastStart);
    },
  );

  it("заканчивает каждую встречу не позже 18:00 и держит шаг 30 минут", () => {
    const slots = generateSlots(45, new Date("2026-11-12T00:00:00Z"));

    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const moscowStartMinutes = (start.getUTCHours() + 3) * 60 + start.getUTCMinutes();
      const moscowEndMinutes = (end.getUTCHours() + 3) * 60 + end.getUTCMinutes();

      expect(start.getUTCMinutes() % 30).toBe(0);
      expect(end.getTime() - start.getTime()).toBe(45 * 60_000);
      expect(moscowStartMinutes).toBeGreaterThanOrEqual(9 * 60);
      expect(moscowEndMinutes).toBeLessThanOrEqual(18 * 60);
    }
  });

  it("возвращает пустой список, если ни один старт не помещается в рабочий день", () => {
    expect(generateSlots(600, new Date("2026-11-12T00:00:00Z"))).toEqual([]);
  });

  it("отдаёт слоты по возрастанию начала", () => {
    const starts = generateSlots(30, new Date("2026-11-12T09:15:00Z")).map((slot) => slot.start);

    expect(starts).toEqual([...starts].sort());
  });
});

describe("границы окна записи", () => {
  it("держит последнюю дату окна, пока по Москве ещё не наступила полночь", () => {
    const days = [
      ...new Set(
        generateSlots(30, new Date("2026-11-12T20:59:00Z")).map((slot) => moscowDate(slot.start)),
      ),
    ];

    expect(days.at(-1)).toBe("2026-11-25");
    expect(days).not.toContain("2026-11-26");
  });

  it("сдвигает окно в полночь по Москве", () => {
    const slots = generateSlots(30, new Date("2026-11-12T21:00:00Z"));
    const days = [...new Set(slots.map((slot) => moscowDate(slot.start)))];

    expect(days[0]).toBe("2026-11-13");
    expect(days.at(-1)).toBe("2026-11-26");
  });

  it("не продлевает окно из-за выходных", () => {
    const slots = generateSlots(30, new Date("2026-11-14T09:00:00Z"));
    const days = [...new Set(slots.map((slot) => moscowDate(slot.start)))];

    expect(days).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
    ]);
  });
});

describe("край рабочего дня", () => {
  it.each([
    { now: "2026-11-12T13:59:00Z", lastStart: "2026-11-12T14:30:00.000Z" },
    { now: "2026-11-12T14:29:00Z", lastStart: "2026-11-12T14:30:00.000Z" },
  ])("в $now ещё можно занять последний старт 17:30 по Москве", ({ now, lastStart }) => {
    const today = generateSlots(30, new Date(now)).filter(
      (slot) => moscowDate(slot.start) === "2026-11-12",
    );

    expect(today.at(-1)?.start).toBe(lastStart);
  });

  it("после 17:30 по Москве не оставляет сегодняшних стартов", () => {
    const today = generateSlots(30, new Date("2026-11-12T14:30:00Z")).filter(
      (slot) => moscowDate(slot.start) === "2026-11-12",
    );

    expect(today).toEqual([]);
  });
});

describe("даты окна записи", () => {
  it("возвращает 14 московских дат подряд, включая выходные", () => {
    const days = bookingWindowDays(new Date("2026-11-12T09:15:00Z"));

    expect(days).toEqual([
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
    ]);
  });

  it("начинает окно с московской даты, а не UTC", () => {
    expect(bookingWindowDays(new Date("2026-11-12T20:59:00Z"))[0]).toBe("2026-11-12");
    expect(bookingWindowDays(new Date("2026-11-12T21:00:00Z"))[0]).toBe("2026-11-13");
  });
});
