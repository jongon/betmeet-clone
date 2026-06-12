import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Resolve the `@/*` path alias (mirrors tsconfig.json) so tests can import
// real modules across features, not only mocked ones.
//
// The React plugin enables JSX/TSX transform for component tests. The default
// test environment stays `node`; component tests opt into jsdom per-file via a
// `// @vitest-environment jsdom` docblock so the existing node tests are
// unaffected.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
