import { describe, expect, it } from "vitest";
import { formatTimeInZone } from "./format";

describe("время слота в поясе гостя", () => {
  it("показывает московское время", () => {
    expect(formatTimeInZone("2026-11-12T10:00:00.000Z", "Europe/Moscow")).toBe("13:00");
  });

  it("пересчитывает время в другой пояс при смене зоны", () => {
    expect(formatTimeInZone("2026-11-12T10:00:00.000Z", "Europe/Berlin")).toBe("11:00");
  });

  it("поддерживает пояса с нецелым смещением", () => {
    expect(formatTimeInZone("2026-11-12T10:00:00.000Z", "Asia/Kathmandu")).toBe("15:45");
  });

  it("показывает полночь как 00:00, а не 24:00", () => {
    expect(formatTimeInZone("2026-11-12T21:00:00.000Z", "Europe/Moscow")).toBe("00:00");
  });
});
