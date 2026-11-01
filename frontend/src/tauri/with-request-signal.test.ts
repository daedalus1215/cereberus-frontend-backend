import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import { withRequestSignal } from "./with-request-signal";

/**
 * Behaves like Tauri's fetch: never answers on its own, and only aborts via
 * `init.signal`.
 */
const stallingTauriFetch = () =>
  vi.fn(
    (_input: URL | Request | string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Request cancelled", "AbortError")),
        );
      }),
  );

const apiWith = (fetchImpl: ReturnType<typeof withRequestSignal>) =>
  axios.create({ adapter: "fetch", env: { fetch: fetchImpl } });

describe("withRequestSignal", () => {
  it("lets axios's timeout abort a stalled request", async () => {
    const tauriFetch = stallingTauriFetch();

    await expect(
      apiWith(withRequestSignal(tauriFetch)).get("https://cereberus.test/x", {
        timeout: 20,
      }),
    ).rejects.toMatchObject({ code: "ETIMEDOUT" });
    expect(tauriFetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("passes cancellation through", async () => {
    const tauriFetch = stallingTauriFetch();
    const controller = new AbortController();

    const request = apiWith(withRequestSignal(tauriFetch)).get(
      "https://cereberus.test/x",
      { signal: controller.signal },
    );
    controller.abort();

    await expect(request).rejects.toSatisfy(axios.isCancel);
  });

  it("keeps the other options axios passes, like connectTimeout", async () => {
    const tauriFetch = vi.fn<
      (input: URL | Request | string, init?: RequestInit) => Promise<Response>
    >(async () => new Response("{}"));

    await axios
      .create({
        adapter: "fetch",
        env: { fetch: withRequestSignal(tauriFetch) },
        fetchOptions: { connectTimeout: 10_000 },
      })
      .get("https://cereberus.test/x");

    expect(tauriFetch.mock.calls[0][1]).toMatchObject({
      connectTimeout: 10_000,
    });
  });
});
