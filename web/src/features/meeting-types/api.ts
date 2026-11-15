import {
  createMeetingType as createMeetingTypeRequest,
  deleteMeetingType as deleteMeetingTypeRequest,
  listMeetingTypes as listMeetingTypesRequest,
  updateMeetingType as updateMeetingTypeRequest,
} from "@/client/sdk.gen";
import type {
  MeetingType,
  MeetingTypeCreate,
  MeetingTypeList,
  MeetingTypeUpdate,
} from "@/client/types.gen";
import { toApiError, unwrapData } from "@/lib/api-error";

/** Размер страницы, который запрашивают экраны: каталог целиком. */
const MEETING_TYPES_LIMIT = 100;

/** Загружает каталог типов встреч целиком одной страницей, при необходимости с поиском. */
export async function listMeetingTypes(params: { search?: string } = {}): Promise<MeetingTypeList> {
  const result = await listMeetingTypesRequest({
    query: {
      limit: MEETING_TYPES_LIMIT,
      ...(params.search === undefined || params.search === "" ? {} : { search: params.search }),
    },
    throwOnError: false,
  });

  return unwrapData(result);
}

/** Создаёт тип встречи; сервер назначает id и время создания. */
export async function createMeetingType(input: MeetingTypeCreate): Promise<MeetingType> {
  const result = await createMeetingTypeRequest({ body: input, throwOnError: false });

  return unwrapData(result);
}

/** Меняет переданные поля типа встречи; остальные остаются как были. */
export async function updateMeetingType(
  id: string,
  input: MeetingTypeUpdate,
): Promise<MeetingType> {
  const result = await updateMeetingTypeRequest({
    path: { id },
    body: input,
    throwOnError: false,
  });

  return unwrapData(result);
}

/**
 * Удаляет тип встречи. Существующие брони сохраняют снимок и продолжают
 * занимать своё время, поэтому удаление разрешено всегда.
 */
export async function deleteMeetingType(id: string): Promise<void> {
  const { error } = await deleteMeetingTypeRequest({ path: { id }, throwOnError: false });

  if (error !== undefined) {
    throw toApiError(error);
  }
}
