import { defineConfig } from "vitest/config";

// Testes que rodam contra o Postgres do Supabase local (npx supabase start).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
