import { listMeetingTypeSlots as listMeetingTypeSlotsRequest } from "@/client/sdk.gen";
import type { SlotList } from "@/client/types.gen";
import { unwrapData } from "@/lib/api-error";

/** Загружает свободные слоты и даты окна записи для типа встречи. */
export async function listMeetingTypeSlots(meetingTypeId: string): Promise<SlotList> {
  const result = await listMeetingTypeSlotsRequest({
    path: { id: meetingTypeId },
    throwOnError: false,
  });

  return unwrapData(result);
}
