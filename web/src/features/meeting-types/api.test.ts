import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { createMeetingType, deleteMeetingType, listMeetingTypes, updateMeetingType } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>, call = 0): string {
  const request = fetchMock.mock.calls[call]?.[0] as Request | string;
  return request instanceof Request ? request.url : String(request);
}

function requestedInit(fetchMock: ReturnType<typeof vi.fn>, call = 0): RequestInit {
  const request = fetchMock.mock.calls[call]?.[0] as Request | string;
  return request instanceof Request
    ? (request as Request)
    : (fetchMock.mock.calls[call]?.[1] ?? {});
}

async function requestedBody(fetchMock: ReturnType<typeof vi.fn>, call = 0): Promise<string> {
  const request = fetchMock.mock.calls[call]?.[0] as Request | string;

  if (request instanceof Request) {
    return request.clone().text();
  }

  return String(fetchMock.mock.calls[call]?.[1]?.body ?? "");
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

  it("передаёт строку поиска в API вместе с полным размером страницы", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, limit: 100 }));
    vi.stubGlobal("fetch", fetchMock);

    await listMeetingTypes({ search: "проект" });

    const url = new URL(requestedUrl(fetchMock));
    expect(url.searchParams.get("search")).toBe("проект");
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("сообщает о сбое связи, когда сервер недоступен", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(listMeetingTypes()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

describe("правка и удаление типа встречи через SDK", () => {
  const meetingType = {
    id: "6d1f8a42-1c4b-4f6e-9d0a-2b7c3e4f5a60",
    name: "Созвон по проекту",
    durationMinutes: 45,
    createdAt: "2026-11-12T09:00:00.000Z",
  };

  it("отправляет PATCH с изменёнными полями и возвращает тип", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...meetingType, name: "Созвон по бюджету" }));
    vi.stubGlobal("fetch", fetchMock);

    const updated = await updateMeetingType(meetingType.id, { name: "Созвон по бюджету" });

    expect(updated.name).toBe("Созвон по бюджету");
    expect(requestedUrl(fetchMock)).toContain(`/api/meeting-types/${meetingType.id}`);
    expect(requestedInit(fetchMock).method).toBe("PATCH");
    expect(await requestedBody(fetchMock)).toBe(JSON.stringify({ name: "Созвон по бюджету" }));
  });

  it("отправляет DELETE и завершается на пустом ответе 204", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteMeetingType(meetingType.id)).resolves.toBeUndefined();

    expect(requestedUrl(fetchMock)).toContain(`/api/meeting-types/${meetingType.id}`);
    expect(requestedInit(fetchMock).method).toBe("DELETE");
  });

  it("различает исчезнувший тип по коду MEETING_TYPE_NOT_FOUND", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "MEETING_TYPE_NOT_FOUND",
              message: "Тип встречи не найден",
            },
          },
          404,
        ),
      ),
    );

    const error = await deleteMeetingType(meetingType.id).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "MEETING_TYPE_NOT_FOUND" });
  });
});
