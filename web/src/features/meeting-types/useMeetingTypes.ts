import { useCallback, useEffect, useState } from "react";
import type { MeetingType } from "@/client/types.gen";
import { listMeetingTypes } from "./api";

/** Задержка между последним нажатием в поиске и запросом каталога. */
const SEARCH_DEBOUNCE_MS = 300;

/** Состояние загрузки каталога типов встреч. */
export type MeetingTypesState =
  | { status: "loading" }
  | { status: "ready"; items: MeetingType[] }
  | { status: "error" };

/**
 * Загружает типы встреч и перезапрашивает каталог, когда меняется строка
 * поиска — с debounce, чтобы не ходить в API на каждое нажатие.
 *
 * `reload` нужен после создания, правки, удаления и по кнопке «Повторить».
 */
export function useMeetingTypes(params: { search?: string } = {}): {
  state: MeetingTypesState;
  reload: () => void;
} {
  const search = params.search ?? "";
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [state, setState] = useState<MeetingTypesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (search === debouncedSearch) {
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [search, debouncedSearch]);

  useEffect(() => {
    let active = true;

    listMeetingTypes({ search: debouncedSearch })
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
  }, [debouncedSearch, attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}
