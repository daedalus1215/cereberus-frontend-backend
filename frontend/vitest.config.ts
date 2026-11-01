import { resolve } from "path";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so unit tests don't load the PWA plugin.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    passWithNoTests: true,
  },
});
