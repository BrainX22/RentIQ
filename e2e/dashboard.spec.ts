import { test, expect } from "@playwright/test";

/**
 * Dashboard route smoke tests.
 *
 * The DashboardPage component calls `router.replace("/auth/login?next=/dashboard")`
 * inside a useEffect that fires as soon as `isUserLoading` becomes false and
 * `user` is null.  In an unauthenticated browser session (no Supabase cookies)
 * the redirect should happen well within 5 seconds.
 *
 * We do NOT attempt to log in — these are purely redirect-behaviour tests.
 */

test.describe("Dashboard route — unauthenticated", () => {
  test("redirects to /auth/login when accessed without a session", async ({
    page,
  }) => {
    // Navigate to the dashboard without any auth cookies.
    await page.goto("/dashboard");

    // Wait for the redirect to complete — the URL must change to the login
    // page within 5 seconds.
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("/auth/login");
  });

  test("redirected login URL contains a next=/dashboard query param", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("next=");
    // The `next` value should reference the dashboard so users land back after
    // signing in.  It may be URL-encoded (%2F) or plain.
    expect(currentUrl.toLowerCase()).toMatch(/next=.*dashboard/);
  });

  test("login page is rendered (not a blank or error screen) after redirect", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Verify the page has some interactive content — at minimum an email input
    // or a heading, so we know we are on a real login page and not a 500.
    const hasEmailInput = await page
      .locator('input[type="email"], input[name="email"]')
      .first()
      .isVisible()
      .catch(() => false);

    const hasHeading = await page
      .getByRole("heading")
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasEmailInput || hasHeading).toBe(true);
  });
});
