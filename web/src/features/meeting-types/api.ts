import {
  createMeetingType as createMeetingTypeRequest,
  listMeetingTypes as listMeetingTypesRequest,
} from "@/client/sdk.gen";
import type { MeetingType, MeetingTypeCreate, MeetingTypeList } from "@/client/types.gen";
import { toApiError } from "@/lib/api-error";

export { ApiError } from "@/lib/api-error";

/** Размер страницы, который запрашивают экраны: каталог целиком. */
const MEETING_TYPES_LIMIT = 100;

/** Загружает каталог типов встреч целиком одной страницей. */
export async function listMeetingTypes(): Promise<MeetingTypeList> {
  const { data, error } = await listMeetingTypesRequest({
    query: { limit: MEETING_TYPES_LIMIT },
    throwOnError: false,
  });

  if (data !== undefined) {
    return data;
  }

  throw toApiError(error);
}

/** Создаёт тип встречи; сервер назначает id и время создания. */
export async function createMeetingType(input: MeetingTypeCreate): Promise<MeetingType> {
  const { data, error } = await createMeetingTypeRequest({ body: input, throwOnError: false });

  if (data !== undefined) {
    return data;
  }

  throw toApiError(error);
}
