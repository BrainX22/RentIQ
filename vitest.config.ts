import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.worktrees/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/app/api/**/*.{ts,tsx}",
        // Component unit tests — Phase 6 originals
        "src/components/calculator/CalculatorResults.tsx",
        "src/components/calculator/ExpenseBreakdown.tsx",
        "src/components/PaywallModal.tsx",
        // Phase 6A — Comparison View
        "src/components/compare/ComparisonGrid.tsx",
        "src/components/compare/VerdictRow.tsx",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        // Infrastructure singletons — mocked in all tests, not unit-testable
        "src/lib/supabase/**",
        "src/lib/stripe.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
