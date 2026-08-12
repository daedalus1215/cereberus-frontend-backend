// Dev-server and preview-server configuration ONLY — none of it reaches the production
// bundle, which is served by nginx with Traefik doing the /api routing.
//
// ⚠️ This file was gitignored, so `npm run build` failed on any clean checkout with
// "Could not resolve ./vite.env.config" — it only worked on machines holding the untracked
// copy. Reading from process.env with defaults makes the build reproducible.
export const env = {
  VITE_API_URL: process.env.VITE_API_URL ?? "http://localhost:3000",
  VITE_PORT: process.env.VITE_PORT ?? "5173",
  VITE_HOST: process.env.VITE_HOST ?? "0.0.0.0",
  VITE_BASE_URL: process.env.VITE_BASE_URL ?? "/",
  VITE_ALLOWED_HOSTS: process.env.VITE_ALLOWED_HOSTS ?? "localhost",
};
