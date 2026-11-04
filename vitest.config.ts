import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "prisma/seed-data.ts"],
      exclude: ["src/generated/**", "src/config/prisma.ts", "src/index.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
