import { describe, expect, it } from "vitest";
import {
  OWNER_TIME_ZONE,
  startOfTimeZoneDay,
  timeZoneOffsetMinutes,
} from "../src/domain/time-zone.js";

describe("часовой пояс владельца", () => {
  it("хранит IANA-имя, а не строку со смещением", () => {
    expect(OWNER_TIME_ZONE).toBe("Europe/Moscow");
  });

  it("вычисляет смещение Москвы из имени зоны: +180 минут круглый год", () => {
    expect(timeZoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(180);
    expect(timeZoneOffsetMinutes(new Date("2026-07-15T12:00:00Z"))).toBe(180);
  });

  it("находит начало московских суток по обе стороны полуночи", () => {
    expect(new Date(startOfTimeZoneDay(new Date("2026-11-12T20:59:00Z"))).toISOString()).toBe(
      "2026-11-11T21:00:00.000Z",
    );
    expect(new Date(startOfTimeZoneDay(new Date("2026-11-12T21:00:00Z"))).toISOString()).toBe(
      "2026-11-12T21:00:00.000Z",
    );
  });
});
