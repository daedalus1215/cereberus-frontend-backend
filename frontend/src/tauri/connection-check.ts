import type { ApiConfig } from "./api-config";
import {
  accessHeaders,
  isAccessDeniedResponse,
  isOriginUnreachableStatus,
} from "./cloudflare-access";

/** Tauri's fetch, with the client options this check uses. */
export type CheckFetch = (
  input: string,
  init?: RequestInit & { connectTimeout?: number; maxRedirections?: number },
) => Promise<Response>;

/**
 * - `invalid-url`: the server address isn't a full http(s) address.
 * - `unreachable`: nothing answered at that address.
 * - `access-denied`: Cloudflare Access rejected the service token.
 * - `backend-down`: Cloudflare let it through but the backend didn't answer.
 * - `not-cereberus`: something answered, but not the Cereberus backend.
 */
export type ConnectionCheck =
  | "ok"
  | "invalid-url"
  | "unreachable"
  | "access-denied"
  | "backend-down"
  | "not-cereberus";

const CONNECT_TIMEOUT_MS = 10_000;
const TOTAL_TIMEOUT_MS = 15_000;

const parseBaseUrl = (apiBaseUrl: string): URL | null => {
  try {
    const url = new URL(apiBaseUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
};

/**
 * Asks the backend's health check (/api/healthz) whether these settings get
 * through: Cloudflare Access has to accept the service token, and the
 * backend has to answer behind it.
 */
export const checkConnection = async (
  config: ApiConfig,
  fetchImpl: CheckFetch,
): Promise<ConnectionCheck> => {
  if (!parseBaseUrl(config.apiBaseUrl)) return "invalid-url";

  let response: Response;
  try {
    // Joined like axios joins baseURL and path, keeping any base path.
    response = await fetchImpl(
      `${config.apiBaseUrl.replace(/\/+$/, "")}/api/healthz`,
      {
        headers: accessHeaders(config),
        connectTimeout: CONNECT_TIMEOUT_MS,
        // A rejected token redirects to Cloudflare's login page.
        maxRedirections: 0,
        signal: AbortSignal.timeout(TOTAL_TIMEOUT_MS),
      },
    );
  } catch {
    return "unreachable";
  }

  if (
    isAccessDeniedResponse(response.status, (name) =>
      response.headers.get(name),
    )
  ) {
    return "access-denied";
  }
  if (isOriginUnreachableStatus(response.status)) return "backend-down";
  if (response.ok) {
    try {
      const body: unknown = await response.json();
      if ((body as { status?: unknown } | null)?.status === "ok") return "ok";
    } catch {
      // Not JSON, so not the backend's health check.
    }
  }
  return "not-cereberus";
};

/** What went wrong, for the connection settings form. */
export const describeConnectionCheck = (
  check: Exclude<ConnectionCheck, "ok">,
  apiBaseUrl: string,
): string => {
  const host = parseBaseUrl(apiBaseUrl)?.host ?? apiBaseUrl;
  switch (check) {
    case "invalid-url":
      return "Enter the full server address, starting with https://.";
    case "unreachable":
      return `Couldn't reach ${host}. Check the address and your connection.`;
    case "access-denied":
      return "Cloudflare Access rejected the client ID or secret.";
    case "backend-down":
      return `Cloudflare accepted the token, but the Cereberus backend at ${host} isn't responding.`;
    case "not-cereberus":
      return `${host} answered, but it isn't the Cereberus backend. Check the address.`;
  }
};
