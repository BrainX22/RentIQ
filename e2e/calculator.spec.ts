import { test, expect } from "@playwright/test";

/**
 * Calculator smoke tests — no auth required.
 *
 * The calculator page renders two sections:
 *   - Left column: CalculatorInputs (Property Price, Monthly Rent, etc.)
 *   - Right column: CalculatorResults (Monthly Cash Flow hero, metric cards)
 *
 * All inputs are plain <input type="number"> elements associated with a
 * <label> via adjacent sibling markup.  We locate them by their visible
 * label text so tests stay resilient to className / DOM-order changes.
 */

test.describe("Calculator page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
  });

  test("page loads with a Property Price input visible", async ({ page }) => {
    // The label "Property Price" is always rendered in the Purchase section.
    await expect(
      page.getByText("Property Price", { exact: true })
    ).toBeVisible();

    // The input below it is a currency input — locate via the label's
    // adjacent wrapper using the label role.
    const priceInput = page
      .getByLabel("Property Price", { exact: true })
      .or(
        // Fallback: first number input in the Purchase section header's sibling
        page.locator('label:has-text("Property Price") + div input[type="number"]')
      );

    await expect(priceInput.first()).toBeVisible();
  });

  test("changing Property Price updates the Monthly Mortgage result", async ({
    page,
  }) => {
    // Locate the property price input by its label.
    // CalculatorInputs wraps <Label> and <CurrencyInput> inside a space-y-1.5 div.
    // The <Label> component renders a <label> element; Playwright's getByLabel
    // picks up the associated input when the label's `for` attribute or
    // surrounding structure is standard — if not, fall back to a CSS path.
    const priceInput = page
      .locator('label:has-text("Property Price")')
      .locator("xpath=following-sibling::div")
      .locator('input[type="number"]')
      .first();

    await priceInput.click({ clickCount: 3 }); // select all existing text
    await priceInput.fill("350000");
    await priceInput.dispatchEvent("input"); // trigger React's synthetic handler

    // After changing the price the results panel should show a Monthly Mortgage
    // metric card with a non-empty currency value.
    const mortgageCard = page.getByText("Monthly Mortgage", { exact: true });
    await expect(mortgageCard).toBeVisible();

    // The sibling <p> with font-mono holds the formatted value (e.g. "$1,234").
    // It should contain at least one digit.
    const mortgageValue = page
      .locator("p.font-mono")
      .filter({ hasText: /\$[\d,]+/ })
      .first();

    await expect(mortgageValue).toBeVisible();
  });

  test("changing Monthly Rent shows a cash flow output", async ({ page }) => {
    const rentInput = page
      .locator('label:has-text("Monthly Rent")')
      .locator("xpath=following-sibling::div")
      .locator('input[type="number"]')
      .first();

    await rentInput.click({ clickCount: 3 });
    await rentInput.fill("2000");
    await rentInput.dispatchEvent("input");

    // The results hero card always shows "Monthly Cash Flow" label and a large
    // currency figure regardless of sign.
    await expect(
      page.getByText("Monthly Cash Flow", { exact: true })
    ).toBeVisible();

    // The hero value has font-mono text-5xl — it must contain a dollar sign.
    const cashFlowHero = page
      .locator(".font-mono.text-5xl, span.font-mono.text-5xl")
      .first();

    await expect(cashFlowHero).toContainText("$");
  });

  test("results section is present on initial load", async ({ page }) => {
    // Even with default/zero inputs the results panel should be mounted.
    await expect(
      page.getByText("Monthly Cash Flow", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("Monthly Mortgage", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("Cash-on-Cash Return", { exact: true })
    ).toBeVisible();
  });
});
