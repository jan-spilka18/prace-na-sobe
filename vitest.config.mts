import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Testy pracují s pražským pásmem a musí projít i na serveru v UTC.
    env: { TZ: "UTC" },
    include: ["src/**/*.test.ts"],
  },
});
