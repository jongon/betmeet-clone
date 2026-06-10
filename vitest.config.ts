import path from "node:path";
import { defineConfig } from "vitest/config";

// Resolve the `@/*` path alias (mirrors tsconfig.json) so tests can import
// real modules across features, not only mocked ones.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
