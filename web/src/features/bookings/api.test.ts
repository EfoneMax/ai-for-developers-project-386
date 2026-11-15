import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { cancelBooking, createBooking, listBookings } from "./api";

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

describe("брони через SDK", () => {
  it("отправляет создание брони на /api/bookings с контактами гостя", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          id: "11111111-1111-4111-8111-111111111111",
          status: "confirmed",
          meetingType: { id: "type", name: "Созвон", durationMinutes: 30 },
          start: "2026-11-13T06:00:00.000Z",
          end: "2026-11-13T06:30:00.000Z",
          guest: { name: "Анна", email: "anna@example.com" },
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createBooking({
      meetingTypeId: "type",
      start: "2026-11-13T06:00:00.000Z",
      guest: { name: "Анна", email: "anna@example.com" },
    });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe("/api/bookings");
    expect(request.method).toBe("POST");
  });

  it("разворачивает занятый слот в ApiError с кодом SLOT_TAKEN", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(
            { error: { code: "SLOT_TAKEN", message: "Это время только что заняли" } },
            409,
          ),
        ),
    );

    const error = await createBooking({
      meetingTypeId: "type",
      start: "2026-11-13T06:00:00.000Z",
      guest: { name: "Анна", email: "anna@example.com" },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "SLOT_TAKEN" });
  });

  it("читает список предстоящих встреч из поля items", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [{ id: "booking" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listBookings()).resolves.toEqual([{ id: "booking" }]);
    expect(new URL(requestedUrl(fetchMock)).pathname).toBe("/api/bookings");
  });

  it("сообщает о сбое связи, когда сервер недоступен", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(listBookings()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("отменяет бронь через POST /api/bookings/{id}/cancel и отдаёт обновлённую бронь", async () => {
    const booking = {
      id: "11111111-1111-4111-8111-111111111111",
      status: "cancelled",
      meetingType: { id: "type", name: "Созвон", durationMinutes: 30 },
      start: "2026-11-13T06:00:00.000Z",
      end: "2026-11-13T06:30:00.000Z",
      guest: { name: "Анна", email: "anna@example.com" },
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(booking));
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelBooking(booking.id)).resolves.toEqual(booking);

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe(`/api/bookings/${booking.id}/cancel`);
    expect(request.method).toBe("POST");
  });

  it("разворачивает неотменяемую бронь в ApiError с кодом BOOKING_NOT_CANCELLABLE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "BOOKING_NOT_CANCELLABLE",
              message: "Эту встречу уже нельзя отменить",
            },
          },
          409,
        ),
      ),
    );

    const error = await cancelBooking("11111111-1111-4111-8111-111111111111").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "BOOKING_NOT_CANCELLABLE" });
  });
});
