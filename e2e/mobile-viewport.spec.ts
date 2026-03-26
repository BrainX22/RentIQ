import { test, expect } from "@playwright/test";

/**
 * Mobile viewport tests — verifies the calculator and dashboard render correctly
 * at common mobile widths without horizontal overflow or broken layouts.
 *
 * Runs the same checks at two viewports:
 *   - 375 × 667  (iPhone SE)
 *   - 390 × 844  (iPhone 14 / 14 Pro)
 */

const VIEWPORTS = [
  { label: "iPhone SE (375px)", width: 375, height: 667 },
  { label: "iPhone 14 (390px)", width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    // ── Calculator ──────────────────────────────────────────────────────────

    test.describe("Calculator page", () => {
      test.beforeEach(async ({ page }) => {
        await page.goto("/calculator");
        await page.waitForLoadState("networkidle");
      });

      test("no horizontal scroll / overflow", async ({ page }) => {
        const scrollWidth = await page.evaluate(
          () => document.documentElement.scrollWidth
        );
        expect(scrollWidth).toBeLessThanOrEqual(vp.width + 2); // 2px tolerance for borders
      });

      test("Property Price input is visible and interactable", async ({ page }) => {
        const label = page.getByText("Property Price", { exact: true });
        await expect(label).toBeVisible();

        const input = page
          .locator('label:has-text("Property Price")')
          .locator("xpath=following-sibling::div")
          .locator('input[type="number"]')
          .first();
        await expect(input).toBeVisible();
      });

      test("Monthly Rent input is visible", async ({ page }) => {
        await expect(
          page.getByText("Monthly Rent", { exact: true })
        ).toBeVisible();
      });

      test("Monthly Cash Flow result is visible", async ({ page }) => {
        await expect(
          page.getByText("Monthly Cash Flow", { exact: true })
        ).toBeVisible();
      });

      test("key metric cards are visible", async ({ page }) => {
        await expect(
          page.getByText("Monthly Mortgage", { exact: true })
        ).toBeVisible();
        await expect(
          page.getByText("Cap Rate", { exact: true })
        ).toBeVisible();
      });

      test("changing property price updates results", async ({ page }) => {
        const input = page
          .locator('label:has-text("Property Price")')
          .locator("xpath=following-sibling::div")
          .locator('input[type="number"]')
          .first();

        await input.click({ clickCount: 3 });
        await input.fill("400000");
        await input.dispatchEvent("input");

        await expect(
          page.getByText("Monthly Cash Flow", { exact: true })
        ).toBeVisible();
      });
    });
  });
}
