import axios, { AxiosHeaders } from "axios";

/**
 * The Cloudflare Access service token's headers, or none for a server Access
 * doesn't protect (both token fields left blank).
 */
export const accessHeaders = (config: {
  cfAccessClientId: string;
  cfAccessClientSecret: string;
}): Record<string, string> =>
  config.cfAccessClientId
    ? {
        "CF-Access-Client-Id": config.cfAccessClientId,
        "CF-Access-Client-Secret": config.cfAccessClientSecret,
      }
    : {};

// Statuses Cloudflare answers with on the origin's behalf when it can't reach
// it, plus the gateway errors a reverse proxy gives for a down backend.
const ORIGIN_UNREACHABLE_STATUSES = new Set([
  502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530,
]);

export const isOriginUnreachableStatus = (status: number): boolean =>
  ORIGIN_UNREACHABLE_STATUSES.has(status);

/**
 * Cloudflare Access turning a request away: without a valid service token it
 * redirects to its login page (302), or answers 401, marking the response
 * with a `WWW-Authenticate: Cloudflare-Access` header. The app doesn't follow
 * redirects (see configureApiForTauri), so it sees either one.
 */
export const isAccessDeniedResponse = (
  status: number,
  header: (name: string) => string | null | undefined,
): boolean =>
  /^cloudflare-access\b/i.test(header("www-authenticate") ?? "") ||
  (status >= 300 &&
    status < 400 &&
    /\.cloudflareaccess\.com\//i.test(header("location") ?? ""));

/**
 * An axios request that Cloudflare Access turned away. Its 401 means the
 * service token was rejected, not that the Cereberus session expired.
 */
export const isAccessDenied = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || !error.response) return false;
  const headers = AxiosHeaders.from(error.response.headers as AxiosHeaders);
  return isAccessDeniedResponse(error.response.status, (name) => {
    const value = headers.get(name);
    return typeof value === "string" ? value : null;
  });
};
