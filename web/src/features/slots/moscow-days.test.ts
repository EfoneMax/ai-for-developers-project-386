import { describe, expect, it } from "vitest";
import { getMoscowWindowDays, groupSlotsByMoscowDay, moscowDateKey } from "./moscow-days";

describe("окно записи на клиенте", () => {
  it("строит 14 московских дат от сегодняшней", () => {
    const days = getMoscowWindowDays(new Date("2026-11-12T09:15:00Z"));

    expect(days.map((day) => day.key)).toEqual([
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

  it("подписывает день недельного календаря по-русски", () => {
    const [firstDay] = getMoscowWindowDays(new Date("2026-11-12T09:15:00Z"));

    expect(firstDay).toMatchObject({
      key: "2026-11-12",
      weekday: "чт",
      dateLabel: "12 нояб.",
      isWeekend: false,
    });
  });

  it("помечает субботу и воскресенье выходными", () => {
    const days = getMoscowWindowDays(new Date("2026-11-12T09:15:00Z"));
    const weekend = days.filter((day) => day.isWeekend);

    expect(weekend.map((day) => day.key)).toEqual([
      "2026-11-14",
      "2026-11-15",
      "2026-11-21",
      "2026-11-22",
    ]);
  });

  it("сдвигает окно в полночь по Москве", () => {
    const beforeMidnight = getMoscowWindowDays(new Date("2026-11-12T20:59:00Z"));
    const afterMidnight = getMoscowWindowDays(new Date("2026-11-12T21:00:00Z"));

    expect(beforeMidnight[0]?.key).toBe("2026-11-12");
    expect(afterMidnight[0]?.key).toBe("2026-11-13");
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
