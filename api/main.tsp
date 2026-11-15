import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

/**
 * Сервис записи на звонок.
 *
 * Контракт — источник истины для маршрутов и типов. Сервер реализует
 * эти маршруты, а TypeScript SDK для фронтенда генерируется из OpenAPI.
 */
@service(#{ title: "Call Booking API" })
@info(#{ version: "0.1.0" })
@server("http://localhost:3000", "Локальный сервер")
@route("/api")
namespace CallBooking;

/** Тело ответа проверки живости. */
@example(#{ status: "ok" })
model HealthBody {
  /** Состояние сервиса. */
  status: "ok";
}

/** Ответ проверки живости сервиса. */
model HealthResponse {
  @statusCode statusCode: 200;
  @body body: HealthBody;
}

/** Проверка живости сервиса. */
@opExample(#{ returnType: #{ statusCode: 200, body: #{ status: "ok" } } })
@tag("Health")
@route("/health")
@get
op getHealth(): HealthResponse;

/**
 * Тип встречи — настройка, по которой гость бронирует слот.
 *
 * Созданный тип сразу виден на странице записи. Названия не уникальны:
 * типы различаются по `id`.
 */
model MeetingType {
  /** Идентификатор, назначает сервер. */
  @format("uuid")
  id: string;

  /** Название, от 1 до 100 символов после удаления пробелов по краям. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Описание, до 1000 символов. Пустое описание не возвращается. */
  @maxLength(1000)
  description?: string;

  /** Длительность встречи в минутах, от 5 до 240. */
  @minValue(5)
  @maxValue(240)
  durationMinutes: int32;

  /** Момент создания в UTC, ISO 8601. */
  createdAt: utcDateTime;
}

/** Поля создания типа встречи. */
model MeetingTypeCreate {
  /** Название, от 1 до 100 символов после удаления пробелов по краям. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Описание, до 1000 символов; пустая строка допустима. */
  @maxLength(1000)
  description?: string;

  /** Длительность встречи в минутах, от 5 до 240. */
  @minValue(5)
  @maxValue(240)
  durationMinutes: int32;
}

/** Страница списка типов встреч. */
model MeetingTypeList {
  /** Типы встреч на текущей странице, от старых к новым. */
  items: MeetingType[];

  /** Общее количество типов встреч. */
  total: int32;

  /** Номер текущей страницы, начиная с 1. */
  page: int32;

  /** Размер страницы, от 1 до 100. */
  limit: int32;
}

/** Параметры списка типов встреч. */
model MeetingTypeListQuery {
  /** Номер страницы, начиная с 1. По умолчанию 1. */
  @query
  @minValue(1)
  page?: int32 = 1;

  /** Размер страницы, от 1 до 100. По умолчанию 20. */
  @query
  @minValue(1)
  @maxValue(100)
  limit?: int32 = 20;
}

/** Ответ со страницей типов встреч. */
model MeetingTypeListResponse {
  @statusCode statusCode: 200;
  @body body: MeetingTypeList;
}

/** Ответ на создание типа встречи. */
model MeetingTypeResponse {
  @statusCode statusCode: 201;
  @body body: MeetingType;
}

/**
 * Слот — интервал времени, который гость может забронировать.
 *
 * Начало и конец — абсолютные моменты UTC. Конец равен началу плюс
 * длительность типа встречи.
 */
model Slot {
  /** Начало слота в UTC, ISO 8601. */
  start: utcDateTime;

  /** Конец слота в UTC, ISO 8601. */
  end: utcDateTime;
}

/** Свободные слоты типа встречи за всё окно записи. */
model SlotList {
  /** Свободные слоты, отсортированные по началу. */
  slots: Slot[];
}

/** Ответ со свободными слотами типа встречи. */
model SlotListResponse {
  @statusCode statusCode: 200;
  @body body: SlotList;
}

/** Стабильный код ошибки API; интерфейс принимает решения по нему. */
enum ErrorCode {
  /** Неверные поля тела запроса или параметры запроса. */
  VALIDATION_ERROR: "VALIDATION_ERROR",

  /** Запрошенный тип встречи не существует. */
  MEETING_TYPE_NOT_FOUND: "MEETING_TYPE_NOT_FOUND",

  /** Запрошенный ресурс не существует. */
  NOT_FOUND: "NOT_FOUND",

  /** Непредвиденная ошибка сервера. */
  INTERNAL_ERROR: "INTERNAL_ERROR",
}

/** Ошибка конкретного поля запроса. */
model ErrorDetail {
  /** Имя поля, как в теле или параметрах запроса. */
  field: string;

  /** Русский текст ошибки для показа рядом с полем. */
  message: string;
}

/** Тело ошибки API. */
model ErrorBody {
  /** Стабильный код ошибки. */
  code: ErrorCode;

  /** Русский текст ошибки; можно показать как есть. */
  message: string;

  /** Ошибки полей, если это ошибка валидации. */
  details?: ErrorDetail[];
}

/** Конверт ошибки API (ADR-0005). */
model ErrorResponse {
  @statusCode statusCode: 400 | 404 | 500;
  @body body: ErrorBody;
}

/** Список типов встреч с пагинацией. */
@tag("Meeting Types")
@route("/meeting-types")
@get
op listMeetingTypes(...MeetingTypeListQuery): MeetingTypeListResponse | ErrorResponse;

/** Создание типа встречи; созданный тип сразу виден гостю. */
@tag("Meeting Types")
@route("/meeting-types")
@post
op createMeetingType(@body body: MeetingTypeCreate): MeetingTypeResponse | ErrorResponse;

/**
 * Свободные слоты типа встречи за всё окно записи.
 *
 * Окно — 14 московских дат, старты по будням с 09:00 до 18:00. Маршрут
 * не принимает дату, диапазон или часовой пояс: клиент показывает время
 * в поясе гостя сам.
 */
@tag("Meeting Types")
@route("/meeting-types/{id}/slots")
@get
op listMeetingTypeSlots(
  /** Идентификатор типа встречи. */
  @path id: string,
): SlotListResponse | ErrorResponse;
