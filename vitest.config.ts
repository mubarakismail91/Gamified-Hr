import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Unit tests for the frontend's pure logic (rank math, permissions, formatting).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
