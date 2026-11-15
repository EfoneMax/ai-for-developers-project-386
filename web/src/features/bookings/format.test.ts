import { describe, expect, it } from "vitest";
import {
  formatDayInZone,
  formatIntervalInZone,
  formatMoscowDay,
  formatMoscowInterval,
} from "./format";

describe("время встречи в кабинете владельца", () => {
  it("показывает московскую дату и интервал", () => {
    expect(formatMoscowDay("2026-11-13T06:00:00.000Z")).toBe("пт, 13 ноября");
    expect(formatMoscowInterval("2026-11-13T06:00:00.000Z", "2026-11-13T06:30:00.000Z")).toBe(
      "09:00–09:30",
    );
  });

  it("переносит дату по Москве, даже если в UTC ещё предыдущий день", () => {
    expect(formatMoscowDay("2026-11-12T21:30:00.000Z")).toBe("пт, 13 ноября");
    expect(formatMoscowInterval("2026-11-12T21:30:00.000Z", "2026-11-12T22:00:00.000Z")).toBe(
      "00:30–01:00",
    );
  });
});

describe("время встречи в поясе гостя", () => {
  it("показывает дату и интервал в выбранном поясе", () => {
    expect(formatDayInZone("2026-11-13T06:00:00.000Z", "Europe/Berlin")).toBe(
      "пятница, 13 ноября 2026",
    );
    expect(
      formatIntervalInZone("2026-11-13T06:00:00.000Z", "2026-11-13T06:30:00.000Z", "Europe/Berlin"),
    ).toBe("07:00–07:30");
  });

  it("переносит дату при переходе через полночь по поясу гостя", () => {
    expect(formatDayInZone("2026-11-13T22:30:00.000Z", "Asia/Tokyo")).toBe(
      "суббота, 14 ноября 2026",
    );
  });
});
