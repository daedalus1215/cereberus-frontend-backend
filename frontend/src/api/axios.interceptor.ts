import axios from "axios";
import { tokenStorage } from "../auth/tokenStorage";
import { getSecurityHeaders } from "../utils/security";
import { accessHeaders, isAccessDenied } from "../tauri/cloudflare-access";
import { openConnectionSettings } from "../tauri/connection-settings";

const api = axios.create({
  baseURL: "/", // We'll handle the full path in the interceptor
  headers: {
    "Content-Type": "application/json",
    ...getSecurityHeaders(),
  },
});

// Without this a blackholed server holds each request for the OS's TCP
// connect timeout (minutes) before it fails.
const CONNECT_TIMEOUT_MS = 10_000;

// The web app is served by Cereberus and calls /api on its own origin, so the
// relative baseURL above is all it needs. The Tauri app (desktop and
// Android) ships its own copy of the UI with no such origin, so it talks to
// an absolute server address, plus a Cloudflare Access service token when
// Access sits in front. See src/tauri/api-config.ts.
//
// Access also rejects the CORS preflight a webview would send for these
// headers (preflights carry no credentials), so requests must bypass the
// webview's network stack entirely: `fetchImpl` is Tauri's Rust-side fetch,
// which isn't subject to CORS.
export const configureApiForTauri = (
  config: {
    apiBaseUrl: string;
    cfAccessClientId: string;
    cfAccessClientSecret: string;
  },
  fetchImpl: (
    input: URL | Request | string,
    init?: RequestInit,
  ) => Promise<Response>,
): void => {
  api.defaults.baseURL = config.apiBaseUrl;
  delete api.defaults.headers.common["CF-Access-Client-Id"];
  delete api.defaults.headers.common["CF-Access-Client-Secret"];
  Object.assign(api.defaults.headers.common, accessHeaders(config));
  api.defaults.adapter = "fetch";
  api.defaults.env = { ...api.defaults.env, fetch: fetchImpl };
  api.defaults.fetchOptions = {
    connectTimeout: CONNECT_TIMEOUT_MS,
    // Cloudflare Access answers a rejected service token with a redirect to
    // its login page. Followed, that page would come back as a 200 that
    // every screen took for the server's answer.
    maxRedirections: 0,
  };
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add /api prefix to all requests except those that already have it
    if (!config.url?.startsWith("/api")) {
      config.url = `/api/${config.url}`;
    }

    const token = tokenStorage.getToken();
    if (token && tokenStorage.isTokenValid()) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Cloudflare Access turned the Tauri app's service token away before the
    // request reached Cereberus. Its 401 isn't the session expiring, so don't
    // sign out over it; ask for a working token instead.
    if (isAccessDenied(error)) {
      openConnectionSettings("access-denied");
      return Promise.reject(error);
    }
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // A 401 from login is just rejected credentials, not an expired
          // session: the page reports it. Redirecting here reloads the page
          // and wipes the message.
          if (error.config?.url?.includes("/auth/login")) {
            break;
          }
          // Handle unauthorized (e.g., redirect to login)
          tokenStorage.removeToken();
          window.location.href = "/login";
          break;
        case 403:
          console.error("Forbidden access: Insufficient permissions");
          break;
        case 404:
          console.error("Not found: Resource not available");
          break;
        default:
          console.error("API Error: Request failed");
      }
    }
    return Promise.reject(error);
  },
);

export default api;
