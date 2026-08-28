import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const goc = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": goc,
    },
  },
});
