type FetchLike = (
  input: URL | Request | string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * axios's fetch adapter puts its abort signal (cancellation and `timeout`)
 * on the Request it passes, and deliberately leaves it out of `init`. Tauri's
 * fetch only listens to `init.signal`, so without this neither ever reaches
 * the Rust side and a stalled request hangs until the app quits.
 */
export const withRequestSignal =
  (fetchImpl: FetchLike): FetchLike =>
  (input, init) =>
    fetchImpl(input, {
      ...init,
      signal:
        init?.signal ?? (input instanceof Request ? input.signal : undefined),
    });
