import { useCallback, useEffect, useState } from "react";
import type { Booking } from "@/client/types.gen";
import { listBookings } from "./api";

/** Состояние загрузки предстоящих встреч владельца. */
export type BookingsState =
  | { status: "loading" }
  | { status: "ready"; items: Booking[] }
  | { status: "error" };

/**
 * Загружает предстоящие встречи один раз при открытии кабинета.
 *
 * Polling не нужен: владелец обновляет список кнопкой «Повторить» после
 * сбоя, а после отмены список перезагрузится вместе с ней.
 */
export function useBookings(): { state: BookingsState; reload: () => void } {
  const [state, setState] = useState<BookingsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    listBookings()
      .then((items) => {
        if (active) {
          setState({ status: "ready", items });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "error" });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}
