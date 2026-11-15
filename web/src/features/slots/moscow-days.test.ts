import { describe, expect, it } from "vitest";
import { groupSlotsByMoscowDay, moscowDateKey, moscowDaysFromKeys } from "./moscow-days";

describe("дни календаря по датам сервера", () => {
  it("подписывает даты окна по-русски", () => {
    const days = moscowDaysFromKeys(["2026-11-25", "2026-11-12"]);

    expect(days).toEqual([
      {
        key: "2026-11-12",
        weekday: "чт",
        dateLabel: "12 нояб.",
        isWeekend: false,
      },
      {
        key: "2026-11-25",
        weekday: "ср",
        dateLabel: "25 нояб.",
        isWeekend: false,
      },
    ]);
  });

  it("помечает субботу и воскресенье выходными", () => {
    const weekend = moscowDaysFromKeys(["2026-11-14", "2026-11-15", "2026-11-21", "2026-11-22"]);

    expect(weekend.map((day) => day.isWeekend)).toEqual([true, true, true, true]);
  });

  it("не добавляет и не убирает даты: окно целиком приходит с сервера", () => {
    const keys = Array.from({ length: 14 }, (_, index) =>
      new Date(Date.UTC(2026, 10, 12 + index)).toISOString().slice(0, 10),
    );

    expect(moscowDaysFromKeys(keys).map((day) => day.key)).toEqual(keys);
  });
});

describe("московская дата слота", () => {
  it("относит момент к московскому календарному дню", () => {
    expect(moscowDateKey("2026-11-12T20:59:00.000Z")).toBe("2026-11-12");
    expect(moscowDateKey("2026-11-12T21:00:00.000Z")).toBe("2026-11-13");
  });

  it("раскладывает слоты по московским датам, а не по UTC", () => {
    const slots = [
      { start: "2026-11-12T20:59:00.000Z", end: "2026-11-12T21:29:00.000Z" },
      { start: "2026-11-12T21:00:00.000Z", end: "2026-11-12T21:30:00.000Z" },
    ];

    const byDay = groupSlotsByMoscowDay(slots);

    expect([...byDay.keys()]).toEqual(["2026-11-12", "2026-11-13"]);
    expect(byDay.get("2026-11-12")?.[0]?.start).toBe("2026-11-12T20:59:00.000Z");
  });
});
