import {
  createMeetingType as createMeetingTypeRequest,
  listMeetingTypes as listMeetingTypesRequest,
} from "@/client/sdk.gen";
import type {
  ErrorBody,
  MeetingType,
  MeetingTypeCreate,
  MeetingTypeList,
} from "@/client/types.gen";

/** Размер страницы, который запрашивают экраны: каталог целиком. */
const MEETING_TYPES_LIMIT = 100;

/** Код ошибки: стабильный код контракта или сбой связи. */
export type ApiErrorCode = ErrorBody["code"] | "NETWORK_ERROR";

/**
 * Ошибка обращения к API. Интерфейс принимает решения по `code`
 * и раскладывает `details` по полям формы.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details: NonNullable<ErrorBody["details"]>;

  constructor(
    code: ApiErrorCode,
    message: string,
    details: NonNullable<ErrorBody["details"]> = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }

  /** Сообщение сервера для конкретного поля, если оно есть. */
  fieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }
}

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

function toApiError(error: unknown): ApiError {
  const body = extractErrorBody(error);

  if (body === undefined) {
    return new ApiError("NETWORK_ERROR", "Не удалось связаться с сервером");
  }

  return new ApiError(body.code, body.message, body.details ?? []);
}

/**
 * Достаёт тело ошибки из ответа клиента. Клиент бросает разобранный
 * JSON целиком, поэтому конверт `{ error: {...} }` разворачивается здесь.
 */
function extractErrorBody(error: unknown): ErrorBody | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const envelope = (error as { error?: unknown }).error;
  if (typeof envelope !== "object" || envelope === null) {
    return undefined;
  }

  const { code, message, details } = envelope as Partial<ErrorBody>;
  if (typeof code !== "string" || typeof message !== "string") {
    return undefined;
  }

  return {
    code: code as ErrorBody["code"],
    message,
    ...(Array.isArray(details) ? { details } : {}),
  };
}
