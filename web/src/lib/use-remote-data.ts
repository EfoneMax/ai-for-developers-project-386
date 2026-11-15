import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiErrorCode } from "./api-error";

/** Состояние загрузки данных из API без polling. */
export type RemoteState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; code?: ApiErrorCode };

/**
 * Загружает данные при монтировании и по изменению `key`, позволяет
 * перезагрузить их кнопкой «Повторить» или после изменения.
 *
 * `reload` сбрасывает состояние в `loading` и повторяет запрос; от гонок
 * защищает флаг активности эффекта.
 */
export function useRemoteData<T>(
  load: () => Promise<T>,
  key: string,
): { state: RemoteState<T>; reload: () => void } {
  const [state, setState] = useState<RemoteState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    load()
      .then((data) => {
        if (active) {
          setState({ status: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            ...(error instanceof ApiError ? { code: error.code } : {}),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [load, key, attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}
