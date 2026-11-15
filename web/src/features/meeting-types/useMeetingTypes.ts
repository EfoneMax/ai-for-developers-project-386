import { useCallback, useEffect, useState } from "react";
import type { MeetingType } from "@/client/types.gen";
import { listMeetingTypes } from "./api";

/** Состояние загрузки каталога типов встреч. */
export type MeetingTypesState =
  | { status: "loading" }
  | { status: "ready"; items: MeetingType[] }
  | { status: "error" };

/**
 * Загружает типы встреч при монтировании и позволяет перезагрузить список —
 * например, после создания типа или по кнопке «Повторить».
 */
export function useMeetingTypes(): { state: MeetingTypesState; reload: () => void } {
  const [state, setState] = useState<MeetingTypesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    listMeetingTypes()
      .then((page) => {
        if (active) {
          setState({ status: "ready", items: page.items });
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
