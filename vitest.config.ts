import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const goc = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    // `.tsx` cũng được thu gom: nếu chỉ khớp `.ts`, một test component tương
    // lai sẽ bị bỏ qua trong im lặng và trông như đang pass.
    include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": goc,
    },
  },
});
