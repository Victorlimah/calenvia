import { defineConfig } from "vitest/config";

// Testes que rodam contra o Postgres do Supabase local (npx supabase start).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./src/test/empty.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    setupFiles: ["tests/db/next-headers-mock.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
