import { loadEnv } from "vite";

// Dev-server and preview-server configuration ONLY — none of it reaches the production
// bundle, which is served by nginx with Traefik doing the /api routing.
//
// Values resolve in this order: real process env > .env files > defaults. Vite does not
// inject .env values into process.env, so the config must call loadEnv itself; reading
// process.env directly made every .env value silently fall back to the defaults.
/**
 * Resolve dev/preview server settings for the given Vite mode.
 * @param mode - The Vite mode, e.g. "development" or "production".
 * @returns The resolved server configuration values.
 */
export function resolveViteEnv(mode: string) {
  const fileEnv: Record<string, string> = loadEnv(mode, process.cwd(), "VITE_");
  const pick = (name: string, fallback: string): string =>
    process.env[name] ?? fileEnv[name] ?? fallback;
  return {
    VITE_API_URL: pick("VITE_API_URL", "http://localhost:3000"),
    VITE_PORT: pick("VITE_PORT", "5173"),
    VITE_HOST: pick("VITE_HOST", "0.0.0.0"),
    VITE_BASE_URL: pick("VITE_BASE_URL", "/"),
    VITE_ALLOWED_HOSTS: pick("VITE_ALLOWED_HOSTS", "localhost"),
  };
}
