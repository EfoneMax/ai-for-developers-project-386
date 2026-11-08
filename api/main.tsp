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
@tag("Health")
@route("/health")
@get
op getHealth(): HealthResponse;
