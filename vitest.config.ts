import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    // Pure-logic unit tests run in Node — no DOM needed. The RLS suite that
    // talks to Supabase self-skips when credentials are absent (e.g. in CI
    // without secrets), so the default `npm test` is always green offline.
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
