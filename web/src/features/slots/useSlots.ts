import { useCallback } from "react";
import type { Slot } from "@/client/types.gen";
import { useRemoteData, type RemoteState } from "@/lib/use-remote-data";
import { listMeetingTypeSlots } from "./api";

/** Состояние загрузки свободных слотов типа встречи. */
export type SlotsState = RemoteState<Slot[]>;

/**
 * Загружает слоты при монтировании и позволяет перезагрузить их —
 * например, по кнопке «Повторить» или после конфликта бронирования.
 */
export function useSlots(meetingTypeId: string): { state: SlotsState; reload: () => void } {
  const load = useCallback(() => listMeetingTypeSlots(meetingTypeId), [meetingTypeId]);

  return useRemoteData(load, meetingTypeId);
}
