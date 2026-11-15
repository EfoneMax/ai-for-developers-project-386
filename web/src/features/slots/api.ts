import { listMeetingTypeSlots as listMeetingTypeSlotsRequest } from "@/client/sdk.gen";
import type { Slot } from "@/client/types.gen";
import { toApiError } from "@/lib/api-error";

/** Загружает свободные слоты типа встречи за всё окно записи. */
export async function listMeetingTypeSlots(meetingTypeId: string): Promise<Slot[]> {
  const { data, error } = await listMeetingTypeSlotsRequest({
    path: { id: meetingTypeId },
    throwOnError: false,
  });

  if (data !== undefined) {
    return data.slots;
  }

  throw toApiError(error);
}
