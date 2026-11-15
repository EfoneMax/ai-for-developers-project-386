import { listMeetingTypeSlots as listMeetingTypeSlotsRequest } from "@/client/sdk.gen";
import type { Slot } from "@/client/types.gen";
import { unwrapData } from "@/lib/api-error";

/** Загружает свободные слоты типа встречи за всё окно записи. */
export async function listMeetingTypeSlots(meetingTypeId: string): Promise<Slot[]> {
  const result = await listMeetingTypeSlotsRequest({
    path: { id: meetingTypeId },
    throwOnError: false,
  });

  return unwrapData(result).slots;
}
