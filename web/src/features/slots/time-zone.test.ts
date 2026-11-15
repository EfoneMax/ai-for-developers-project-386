import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, isTimeZone, resolveTimeZone } from "./time-zone";

describe("часовой пояс гостя", () => {
  it("предпочитает сохранённый пояс", () => {
    expect(resolveTimeZone({ stored: "Europe/Berlin", detected: "Asia/Tokyo" })).toBe(
      "Europe/Berlin",
    );
  });

  it("игнорирует мусор в хранилище и берёт определённый пояс", () => {
    expect(resolveTimeZone({ stored: "не/пояс", detected: "Asia/Tokyo" })).toBe("Asia/Tokyo");
  });

  it("падает на Europe/Moscow, если браузер не определил пояс", () => {
    expect(resolveTimeZone({ stored: null, detected: undefined })).toBe(DEFAULT_TIME_ZONE);
    expect(DEFAULT_TIME_ZONE).toBe("Europe/Moscow");
  });

  it("падает на Europe/Moscow на неверном определённом поясе", () => {
    expect(resolveTimeZone({ stored: null, detected: "Марс/Олимп" })).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone({ stored: "", detected: "" })).toBe(DEFAULT_TIME_ZONE);
  });

  it("признаёт только существующие IANA-зоны", () => {
    expect(isTimeZone("Europe/Moscow")).toBe(true);
    expect(isTimeZone("Europe/Berlin")).toBe(true);
    expect(isTimeZone("Europe/Atlantis")).toBe(false);
    expect(isTimeZone(null)).toBe(false);
  });
});
