import { defineConfig } from "vite-plus/test/config";

// Keep unit tests independent of the application's Void/Cloudflare plugins.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
