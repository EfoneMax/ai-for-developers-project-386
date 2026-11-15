import { useCallback, useEffect, useState } from "react";
import type { Slot } from "@/client/types.gen";
import { listMeetingTypeSlots } from "./api";

/** Состояние загрузки свободных слотов типа встречи. */
export type SlotsState =
  | { status: "loading" }
  | { status: "ready"; slots: Slot[] }
  | { status: "error" };

/**
 * Загружает слоты при монтировании и позволяет перезагрузить их —
 * например, по кнопке «Повторить» или после конфликта бронирования.
 */
export function useSlots(meetingTypeId: string): { state: SlotsState; reload: () => void } {
  const [state, setState] = useState<SlotsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    listMeetingTypeSlots(meetingTypeId)
      .then((slots) => {
        if (active) {
          setState({ status: "ready", slots });
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
  }, [meetingTypeId, attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}
