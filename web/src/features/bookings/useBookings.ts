import { useCallback } from "react";
import type { Booking } from "@/client/types.gen";
import { useRemoteData, type RemoteState } from "@/lib/use-remote-data";
import { listBookings } from "./api";

/** Состояние загрузки предстоящих встреч владельца. */
export type BookingsState = RemoteState<Booking[]>;

/**
 * Загружает предстоящие встречи один раз при открытии кабинета.
 *
 * Polling не нужен: владелец обновляет список кнопкой «Повторить» после
 * сбоя, а после отмены список перезагрузится вместе с ней.
 */
export function useBookings(): { state: BookingsState; reload: () => void } {
  const load = useCallback(() => listBookings(), []);

  return useRemoteData(load, "upcoming");
}
