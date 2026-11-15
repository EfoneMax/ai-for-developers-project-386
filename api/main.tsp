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

/**
 * Поля частичного изменения типа встречи.
 *
 * Передайте непустое подмножество полей; `id` и `createdAt` неизменяемы.
 * Пустая строка в `description` убирает описание.
 */
model MeetingTypeUpdate {
  /** Название, от 1 до 100 символов после удаления пробелов по краям. */
  @minLength(1)
  @maxLength(100)
  name?: string;

  /** Описание, до 1000 символов; пустая строка убирает описание. */
  @maxLength(1000)
  description?: string;

  /** Длительность встречи в минутах, от 5 до 240. */
  @minValue(5)
  @maxValue(240)
  durationMinutes?: int32;
}

/** Поле сортировки списка типов встреч. */
enum MeetingTypeSort {
  /** По времени создания. */
  createdAt: "createdAt",

  /** По названию. */
  name: "name",

  /** По длительности встречи. */
  durationMinutes: "durationMinutes",
}

/** Направление сортировки списка. */
enum SortOrder {
  /** По возрастанию. */
  asc: "asc",

  /** По убыванию. */
  desc: "desc",
}

/** Страница списка типов встреч. */
model MeetingTypeList {
  /** Типы встреч на текущей странице. */
  items: MeetingType[];

  /** Общее количество типов встреч с учётом поиска. */
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

  /** Поле сортировки. По умолчанию `createdAt`. */
  @query
  sort?: MeetingTypeSort = MeetingTypeSort.createdAt;

  /** Направление сортировки. По умолчанию `asc`. */
  @query
  order?: SortOrder = SortOrder.asc;

  /** Подстрока без учёта регистра по названию и описанию. */
  @query
  search?: string;
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

/** Ответ на изменение типа встречи. */
model MeetingTypeUpdateResponse {
  @statusCode statusCode: 200;
  @body body: MeetingType;
}

/** Ответ на удаление типа встречи: тела нет. */
model MeetingTypeDeleteResponse {
  @statusCode statusCode: 204;
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

  /**
   * Московские даты окна записи в формате `YYYY-MM-DD`, 14 подряд начиная
   * с сегодняшней. Сервер — источник «сегодня»: клиент не считает окно
   * по своим часам.
   */
  windowDays: string[];
}

/** Ответ со свободными слотами типа встречи. */
model SlotListResponse {
  @statusCode statusCode: 200;
  @body body: SlotList;
}

/**
 * Контактные данные гостя в брони.
 *
 * Гость не учётная запись: у него нет id, подтверждения email и списка
 * своих броней.
 */
model Guest {
  /** Имя, от 1 до 100 символов после удаления пробелов по краям. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Email до 254 символов с базовой проверкой формата. */
  @maxLength(254)
  @format("email")
  email: string;

  /** Комментарий до 1000 символов. Пустой комментарий не возвращается. */
  @maxLength(1000)
  comment?: string;
}

/** Снимок типа встречи на момент создания брони (ADR-0006). */
model BookingMeetingType {
  /** Идентификатор исходного типа; тип может быть уже удалён. */
  @format("uuid")
  id: string;

  /** Название типа на момент записи. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Длительность встречи в минутах на момент записи. */
  @minValue(5)
  @maxValue(240)
  durationMinutes: int32;
}

/** Статус брони: подтверждённая занимает слот, отменённая — нет. */
enum BookingStatus {
  /** Бронь действует. */
  confirmed: "confirmed",

  /** Бронь отменена владельцем. */
  cancelled: "cancelled",
}

/**
 * Бронь — подтверждённое гостем право занять слот вместе с контактами.
 *
 * Хранит снимок типа встречи, поэтому правка или удаление типа не меняет
 * уже созданную бронь.
 */
model Booking {
  /** Идентификатор, назначает сервер; в интерфейсе не показывается. */
  @format("uuid")
  id: string;

  /** Статус брони. */
  status: BookingStatus;

  /** Снимок типа встречи на момент записи. */
  meetingType: BookingMeetingType;

  /** Начало встречи в UTC, ISO 8601. */
  start: utcDateTime;

  /** Конец встречи в UTC; равен началу плюс длительность из снимка. */
  end: utcDateTime;

  /** Контактные данные гостя. */
  guest: Guest;
}

/** Поля создания брони. */
model BookingCreate {
  /** Идентификатор типа встречи из каталога. */
  meetingTypeId: string;

  /** Желаемое начало встречи в UTC, ISO 8601. */
  start: utcDateTime;

  /** Контактные данные гостя. */
  guest: Guest;
}

/** Предстоящие брони владельца. */
model BookingList {
  /** Предстоящие брони, отсортированные по началу. */
  items: Booking[];
}

/** Ответ со списком предстоящих броней. */
model BookingListResponse {
  @statusCode statusCode: 200;
  @body body: BookingList;
}

/** Ответ на создание брони. */
model BookingResponse {
  @statusCode statusCode: 201;
  @body body: Booking;
}

/** Ответ на отмену брони: та же бронь в статусе `cancelled`. */
model BookingCancelResponse {
  @statusCode statusCode: 200;
  @body body: Booking;
}

/** Стабильный код ошибки API; интерфейс принимает решения по нему. */
enum ErrorCode {
  /** Неверные поля тела запроса или параметры запроса. */
  VALIDATION_ERROR: "VALIDATION_ERROR",

  /** Запрошенный тип встречи не существует. */
  MEETING_TYPE_NOT_FOUND: "MEETING_TYPE_NOT_FOUND",

  /** Выбранное время уже занято другой бронью. */
  SLOT_TAKEN: "SLOT_TAKEN",

  /** Запрошенная бронь не существует. */
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",

  /** Бронь уже отменена или её время уже прошло. */
  BOOKING_NOT_CANCELLABLE: "BOOKING_NOT_CANCELLABLE",

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
  @statusCode statusCode: 400 | 404 | 409 | 500;
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
 * Частичное изменение типа встречи.
 *
 * Меняет непустое подмножество `name`, `description` и `durationMinutes`
 * с теми же правилами, что при создании; `id` и `createdAt` неизменяемы.
 * Неизвестный тип — 404 `MEETING_TYPE_NOT_FOUND`.
 */
@tag("Meeting Types")
@route("/meeting-types/{id}")
@patch
op updateMeetingType(
  /** Идентификатор типа встречи. */
  @path id: string,
  @body body: MeetingTypeUpdate,
): MeetingTypeUpdateResponse | ErrorResponse;

/**
 * Удаление типа встречи.
 *
 * Разрешено всегда, в том числе при предстоящих бронях: существующие брони
 * сохраняют снимок и продолжают занимать своё время. Неизвестный тип — 404.
 */
@tag("Meeting Types")
@route("/meeting-types/{id}")
@delete
op deleteMeetingType(
  /** Идентификатор типа встречи. */
  @path id: string,
): MeetingTypeDeleteResponse | ErrorResponse;

/**
 * Свободные слоты типа встречи за всё окно записи.
 *
 * Окно — 14 московских дат, начиная с сегодняшней. Часовой пояс владельца —
 * `Europe/Moscow` (UTC+3), старты по будням с 09:00 до 18:00. Сервер отдаёт
 * и свободные слоты, и сами даты окна: гость видит все 14 дат, включая
 * выходные и дни без слотов. Маршрут не принимает дату, диапазон или
 * часовой пояс: клиент показывает время в поясе гостя сам.
 */
@tag("Meeting Types")
@route("/meeting-types/{id}/slots")
@get
op listMeetingTypeSlots(
  /** Идентификатор типа встречи. */
  @path id: string,
): SlotListResponse | ErrorResponse;

/**
 * Создание брони.
 *
 * Сервер заново проверяет сетку, рабочий день, окно записи, `start > now`
 * и `end ≤ 18:00`, не доверяя ответу доступности. Проверка занятости и
 * вставка брони идут синхронно, поэтому из двух одновременных запросов
 * на один слот успешно проходит ровно один.
 */
@tag("Bookings")
@route("/bookings")
@post
op createBooking(@body body: BookingCreate): BookingResponse | ErrorResponse;

/**
 * Предстоящие брони владельца.
 *
 * Только подтверждённые брони, которые ещё не закончились, по возрастанию
 * начала. Отменённые и прошедшие брони в список не попадают.
 */
@tag("Bookings")
@route("/bookings")
@get
op listBookings(): BookingListResponse | ErrorResponse;

/**
 * Отмена брони владельцем.
 *
 * Единственный переход `confirmed → cancelled`: запись сохраняется, снимок
 * типа и время не пересчитываются, отменённая бронь освобождает слот.
 * Отменить можно, пока `end > now`; уже отменённая или прошедшая бронь
 * отвечает 409 `BOOKING_NOT_CANCELLABLE`, неизвестный `id` — 404
 * `BOOKING_NOT_FOUND`.
 */
@tag("Bookings")
@route("/bookings/{id}/cancel")
@post
op cancelBooking(
  /** Идентификатор брони. */
  @path id: string,
): BookingCancelResponse | ErrorResponse;
