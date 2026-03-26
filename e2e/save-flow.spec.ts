import { test, expect } from "@playwright/test";

/**
 * Save-flow smoke tests — unauthenticated path.
 *
 * When the user is NOT logged in and clicks "Save Property":
 *   1. The current inputs are serialised to localStorage under the key
 *      "rpc:pendingCalculatorInputs".
 *   2. The router redirects to "/auth/login?next=/calculator".
 *
 * These tests verify that the unauthenticated save flow:
 *   - Does NOT throw a JavaScript error
 *   - Redirects to the login page (not a crash/blank screen)
 *   - The page remains usable before the button is clicked
 */

test.describe("Save flow — unauthenticated", () => {
  test("calculator is usable after filling in property price and monthly rent", async ({
    page,
  }) => {
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");

    // Fill property price.
    const priceInput = page
      .locator('label:has-text("Property Price")')
      .locator("xpath=following-sibling::div")
      .locator('input[type="number"]')
      .first();

    await priceInput.click({ clickCount: 3 });
    await priceInput.fill("200000");
    await priceInput.dispatchEvent("input");

    // Fill monthly rent.
    const rentInput = page
      .locator('label:has-text("Monthly Rent")')
      .locator("xpath=following-sibling::div")
      .locator('input[type="number"]')
      .first();

    await rentInput.click({ clickCount: 3 });
    await rentInput.fill("1500");
    await rentInput.dispatchEvent("input");

    // The results section should still be visible after editing inputs.
    await expect(
      page.getByText("Monthly Cash Flow", { exact: true })
    ).toBeVisible();

    // The Save button must be present and enabled.
    const saveButton = page.getByRole("button", {
      name: /save property/i,
    });

    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
  });

  test("clicking Save while unauthenticated redirects to /auth/login", async ({
    page,
  }) => {
    // Collect any uncaught JS errors on the page.
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");

    const saveButton = page.getByRole("button", {
      name: /save property/i,
    });

    await saveButton.click();

    // Expect a redirect to the login page within 5 seconds.
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });

    expect(page.url()).toContain("/auth/login");

    // No uncaught JS errors should have occurred.
    expect(jsErrors).toHaveLength(0);
  });

  test("unauthenticated save redirect preserves next=/calculator param", async ({
    page,
  }) => {
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");

    const saveButton = page.getByRole("button", {
      name: /save property/i,
    });

    await saveButton.click();

    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });

    // The redirect should include ?next=/calculator so the app can restore
    // the pending inputs from localStorage after the user signs in.
    expect(page.url().toLowerCase()).toMatch(/next=.*calculator/);
  });

  test("no JavaScript errors on calculator page with default inputs", async ({
    page,
  }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");

    expect(jsErrors).toHaveLength(0);
  });
});
