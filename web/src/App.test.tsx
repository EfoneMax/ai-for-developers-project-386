import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { getHealth } from "./client/sdk.gen";

vi.mock("./client/sdk.gen", () => ({
  getHealth: vi.fn<typeof getHealth>(),
}));

const getHealthMock = vi.mocked(getHealth);

type HealthResult = Awaited<ReturnType<typeof getHealth>>;

function ok(): HealthResult {
  return { data: { status: "ok" } } as HealthResult;
}

function fail(): HealthResult {
  return { error: { message: "boom" } } as HealthResult;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App", () => {
  it("shows the API status after a successful request", async () => {
    getHealthMock.mockResolvedValue(ok() as never);

    render(<App />);

    expect(await screen.findByText("API отвечает")).toBeTruthy();
  });

  it("ignores a stale response after StrictMode runs the effect twice", async () => {
    const first = deferred<HealthResult>();
    const second = deferred<HealthResult>();
    let callCount = 0;

    getHealthMock.mockImplementation(() => {
      callCount += 1;

      if (callCount === 1) return first.promise as never;
      if (callCount === 2) return second.promise as never;

      return Promise.resolve(ok()) as never;
    });

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(getHealthMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    first.resolve(fail());
    second.resolve(ok());

    expect(await screen.findByText("API отвечает")).toBeTruthy();
    expect(screen.queryByText("API вернул ошибку")).toBeNull();
  });

  it("disables the refresh button while a request is in flight", () => {
    getHealthMock.mockImplementation((() => new Promise(() => {})) as never);

    render(<App />);

    const button = screen.getByRole("button", { name: /Проверить снова/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
