import { test, expect } from "@playwright/test";

/**
 * Paywall / calculator UI smoke tests — no auth or external service needed.
 *
 * These tests verify that:
 *   1. The /calculator page loads without a hard JavaScript error.
 *   2. The core input and result elements are present in the DOM.
 *   3. The Save Property button (which triggers the paywall for authenticated
 *      free-tier users) is rendered and accessible.
 *   4. The PaywallModal is NOT visible on initial load (it is only shown after
 *      a 403 FREE_LIMIT_REACHED API response).
 *
 * No Supabase, Stripe, or network mocking is required.
 */

test.describe("Paywall and calculator UI", () => {
  test.beforeEach(async ({ page }) => {
    // Collect uncaught errors so each test can assert zero JS crashes.
    page.on("pageerror", (err) => {
      // Re-throw so Playwright marks the test as failed if the page explodes.
      throw new Error(`Uncaught page error: ${err.message}`);
    });

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
  });

  test("page loads without a hard JavaScript error", async ({ page }) => {
    // If the beforeEach pageerror handler fires, this test will fail
    // automatically.  An explicit assertion makes the intent clear.
    await expect(page).toHaveURL(/\/calculator/);
  });

  test("property price input is present", async ({ page }) => {
    await expect(
      page.getByText("Property Price", { exact: true })
    ).toBeVisible();

    const priceInput = page
      .locator('label:has-text("Property Price")')
      .locator("xpath=following-sibling::div")
      .locator('input[type="number"]')
      .first();

    await expect(priceInput).toBeVisible();
  });

  test("monthly rent input is present", async ({ page }) => {
    // Use label-only locator — "Monthly Rent" also appears in ExpenseBreakdown span
    await expect(
      page.locator("label").filter({ hasText: /^Monthly Rent$/ })
    ).toBeVisible();

    const rentInput = page
      .locator('label:has-text("Monthly Rent")')
      .locator("xpath=following-sibling::div")
      .locator('input[type="number"]')
      .first();

    await expect(rentInput).toBeVisible();
  });

  test("results section labels are present", async ({ page }) => {
    await expect(
      page.getByText("Monthly Cash Flow", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("Monthly Mortgage", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("Cash-on-Cash Return", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("Annual Cash Flow", { exact: true })
    ).toBeVisible();
  });

  test("Save Property button is rendered and accessible", async ({ page }) => {
    const saveButton = page.getByRole("button", {
      name: /save property/i,
    });

    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
  });

  test("PaywallModal is NOT visible on initial page load", async ({ page }) => {
    // The PaywallModal is controlled by `showPaywall` state, which starts
    // as false.  It should not be in the DOM in an open state at cold load.
    // Shadcn/ui Dialog conditionally renders content; checking for the
    // upgrade heading is a reliable proxy.
    const paywallHeading = page.getByRole("heading", {
      name: /upgrade/i,
    });

    // We use `not.toBeVisible()` rather than `not.toBeInTheDOM()` because the
    // dialog may remain mounted but hidden.
    await expect(paywallHeading).not.toBeVisible();
  });

  test("Financing section inputs are present (interest rate, loan term)", async ({
    page,
  }) => {
    await expect(
      page.getByText("Interest Rate", { exact: true })
    ).toBeVisible();

    // Loan term buttons: 15 yr, 20 yr, 30 yr
    await expect(page.getByRole("button", { name: "15 yr" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30 yr" })).toBeVisible();
  });

  test("Deal Score badge is rendered in the results panel", async ({ page }) => {
    await expect(page.getByText("Deal Score", { exact: true })).toBeVisible();
  });
});
