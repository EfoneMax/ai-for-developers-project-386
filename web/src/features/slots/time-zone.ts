import { useCallback, useState } from "react";

/** Пояс владельца; он же запасной вариант для гостя. */
export const DEFAULT_TIME_ZONE = "Europe/Moscow";

/** Ключ, под которым выбранный пояс гостя хранится между визитами. */
const TIME_ZONE_STORAGE_KEY = "call-booking:time-zone";

/** Проверяет, что строка — существующая зона IANA. */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Выбирает пояс гостя: сохранённый вручную, затем определённый браузером,
 * затем московский. Мусор в хранилище не ломает страницу.
 */
export function resolveTimeZone({
  stored,
  detected,
}: {
  stored?: string | null;
  detected?: string | null;
}): string {
  if (isTimeZone(stored)) {
    return stored;
  }

  if (isTimeZone(detected)) {
    return detected;
  }

  return DEFAULT_TIME_ZONE;
}

/** Пояс из настроек браузера; может отсутствовать или быть неверным. */
function detectTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function readStoredTimeZone(): string | null {
  try {
    return window.localStorage.getItem(TIME_ZONE_STORAGE_KEY);
  } catch {
    // Хранилище может быть недоступно — тогда пояс определится заново.
    return null;
  }
}

function storeTimeZone(timeZone: string): void {
  try {
    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, timeZone);
  } catch {
    // Запоминание пояса не критично: страница продолжит работать без него.
  }
}

/** Пояс гостя с ручным выбором и запоминанием в localStorage. */
export function useGuestTimeZone(): {
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
} {
  const [timeZone, setTimeZoneState] = useState(() =>
    resolveTimeZone({ stored: readStoredTimeZone(), detected: detectTimeZone() }),
  );

  const setTimeZone = useCallback((nextTimeZone: string) => {
    if (!isTimeZone(nextTimeZone)) {
      return;
    }

    setTimeZoneState(nextTimeZone);
    storeTimeZone(nextTimeZone);
  }, []);

  return { timeZone, setTimeZone };
}

/** Все зоны IANA для ручного выбора; текущая зона есть в списке всегда. */
export function supportedTimeZones(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

  return zones.includes(current) ? zones : [current, ...zones];
}
