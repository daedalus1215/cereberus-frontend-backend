import axios from "axios";
import { tokenStorage } from "../auth/tokenStorage";
import { getSecurityHeaders } from "../utils/security";

const api = axios.create({
  baseURL: "/", // We'll handle the full path in the interceptor
  headers: {
    "Content-Type": "application/json",
    ...getSecurityHeaders(),
  },
});

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
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
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
