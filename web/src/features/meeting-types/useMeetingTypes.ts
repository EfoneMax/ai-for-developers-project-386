import { useCallback, useEffect, useState } from "react";
import type { MeetingType } from "@/client/types.gen";
import { useRemoteData, type RemoteState } from "@/lib/use-remote-data";
import { listMeetingTypes } from "./api";

/** Задержка между последним нажатием в поиске и запросом каталога. */
const SEARCH_DEBOUNCE_MS = 300;

/** Состояние загрузки каталога типов встреч. */
export type MeetingTypesState = RemoteState<MeetingType[]>;

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

  const load = useCallback(async () => {
    const page = await listMeetingTypes({ search: debouncedSearch });
    return page.items;
  }, [debouncedSearch]);

  return useRemoteData(load, debouncedSearch);
}
