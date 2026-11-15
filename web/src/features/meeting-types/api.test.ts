import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createMeetingType, listMeetingTypes } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  const request = fetchMock.mock.calls[0]?.[0] as Request | string;
  return request instanceof Request ? request.url : String(request);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("каталог типов встреч через SDK", () => {
  it("запрашивает весь каталог одной страницей limit=100", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, limit: 100 }));
    vi.stubGlobal("fetch", fetchMock);

    await listMeetingTypes();

    const url = new URL(requestedUrl(fetchMock));
    expect(url.pathname).toBe("/api/meeting-types");
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("возвращает разобранный конверт ошибки с кодами полей", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Проверьте заполнение полей",
              details: [{ field: "name", message: "Укажите название" }],
            },
          },
          400,
        ),
      ),
    );

    const error = await createMeetingType({ name: "", durationMinutes: 30 }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Проверьте заполнение полей",
    });
    expect((error as ApiError).fieldError("name")).toBe("Укажите название");
  });

  it("сообщает о сбое связи, когда сервер недоступен", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(listMeetingTypes()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
