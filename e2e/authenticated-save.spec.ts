import { test, expect, type Page } from "@playwright/test";

// ─── Supabase project constants ────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PROJECT_REF = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1]!;

// ─── Fake auth fixtures ────────────────────────────────────────────────────────

const MOCK_USER = {
  id: "test-user-id-e2e",
  aud: "authenticated",
  role: "authenticated",
  email: "test@e2e.com",
  email_confirmed_at: "2024-01-01T00:00:00.000000Z",
  phone: "",
  created_at: "2024-01-01T00:00:00.000000Z",
  updated_at: "2024-01-01T00:00:00.000000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  factors: [],
};

const FAKE_SESSION = {
  access_token: "fake-e2e-access-token",
  refresh_token: "fake-e2e-refresh-token",
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: "bearer",
  user: MOCK_USER,
};

// ─── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Injects a fake Supabase session so the browser client treats the user as
 * authenticated.  Uses two complementary strategies:
 *
 * 1. Sets an auth cookie in the exact format @supabase/ssr v0.9.0 uses:
 *    "base64-" + base64url(sessionJSON), stored under the storage-key cookie
 *    (no ".0" suffix — small sessions are stored as a single cookie).
 *    This ensures onAuthStateChange fires with the session during init,
 *    preventing the dashboard's immediate redirect to /auth/login.
 *
 * 2. Mocks GET /auth/v1/user so the subsequent session-validation request
 *    returns our fake user regardless of the Authorization header sent.
 *
 * Must be called BEFORE page.goto().
 */
async function setupAuth(page: Page): Promise<void> {
  // ── 1. Inject auth cookie in @supabase/ssr v0.9.0 format ──────────────────
  const sessionJson = JSON.stringify(FAKE_SESSION);
  // base64url: standard base64 with + → -, / → _, no = padding
  const base64url = Buffer.from(sessionJson, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const cookieValue = `base64-${base64url}`;
  const storageKey = `sb-${PROJECT_REF}-auth-token`;

  // The encoded value is < 3 180 chars, so @supabase/ssr stores it as a
  // single cookie with the storage key as-is (no ".0" suffix).
  await page.context().addCookies([
    {
      name: storageKey,
      value: cookieValue,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
    // Bypass the server-side middleware auth check (requires E2E_AUTH_BYPASS_SECRET — see middleware.ts)
    {
      name: "e2e-auth-bypass",
      value: (() => {
        const secret = process.env.E2E_AUTH_BYPASS_SECRET;
        if (!secret) throw new Error("E2E_AUTH_BYPASS_SECRET must be set to run E2E tests");
        return secret;
      })(),
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
  ]);

  // ── 2. Mock Supabase auth endpoints ───────────────────────────────────────
  // The client always calls GET /auth/v1/user to validate the session.
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    })
  );

  // Token refresh — keep the fake session alive if the client tries to refresh
  await page.route(`${SUPABASE_URL}/auth/v1/token*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_SESSION),
    })
  );
}

/**
 * Waits until the page has resolved the auth state and shows the user as
 * authenticated (i.e., the "(sign in to save)" nudge inside the Save button
 * has disappeared).
 */
async function waitForAuthenticated(page: Page): Promise<void> {
  // The save button contains this span ONLY when user === null
  await expect(page.getByText("(sign in to save)")).not.toBeVisible({
    timeout: 8_000,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Save flow — authenticated", () => {
  // ── Auth check ──────────────────────────────────────────────────────────────

  test("Save Property button does not show sign-in nudge when authenticated", async ({
    page,
  }) => {
    await setupAuth(page);
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    const saveBtn = page.getByRole("button", { name: /save property/i });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).not.toContainText("sign in");
  });

  // ── PropertyNameDialog opens ────────────────────────────────────────────────

  test("clicking Save Property opens PropertyNameDialog", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    await page.getByRole("button", { name: /save property/i }).click();

    // Dialog should appear with "Save Property" title and pre-filled input
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Save Property" })
    ).toBeVisible();
    await expect(dialog.locator("#property-name")).toHaveValue(
      "My next rental deal"
    );
  });

  test("PropertyNameDialog Cancel button closes the dialog", async ({
    page,
  }) => {
    await setupAuth(page);
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    await page.getByRole("button", { name: /save property/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Successful save ─────────────────────────────────────────────────────────

  test("successful save (201) redirects to /dashboard", async ({ page }) => {
    await setupAuth(page);

    // Mock POST /api/properties → 201
    await page.route("/api/properties", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            property: { id: "prop-1", property_name: "My next rental deal" },
          }),
        });
      }
      // GET — used by dashboard after redirect
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ properties: [] }),
      });
    });

    // Mock ancillary dashboard endpoints to avoid errors after redirect
    await page.route("/api/watchlist-criteria", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ criteria: null }),
      })
    );
    await page.route("/api/daily-digest", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          windowHours: 24,
          totalNewProperties: 0,
          matches: [],
          notes: [],
        }),
      })
    );
    await page.route(`${SUPABASE_URL}/rest/v1/subscriptions*`, (route) =>
      route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify({
          code: "PGRST116",
          details: "The result contains 0 rows",
          hint: null,
          message: "JSON object requested, multiple (or no) rows returned",
        }),
      })
    );
    await page.route(`${SUPABASE_URL}/rest/v1/usage_tracking*`, (route) =>
      route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify({
          code: "PGRST116",
          details: "The result contains 0 rows",
          hint: null,
          message: "JSON object requested, multiple (or no) rows returned",
        }),
      })
    );

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    // Open dialog and submit
    await page.getByRole("button", { name: /save property/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Save Property" }).click();

    // Should redirect to dashboard after successful save
    await page.waitForURL(/\/dashboard/, { timeout: 8_000 });
    expect(page.url()).toContain("/dashboard");
  });

  // ── Paywall (FREE_LIMIT_REACHED) ────────────────────────────────────────────

  test("403 FREE_LIMIT_REACHED response opens PaywallModal", async ({
    page,
  }) => {
    await setupAuth(page);

    await page.route("/api/properties", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Free limit reached.",
            code: "FREE_LIMIT_REACHED",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    await page.getByRole("button", { name: /save property/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Save Property" }).click();

    // PaywallModal should open with upgrade prompt
    await expect(
      page.getByText(/all 3 free saves this month/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /upgrade to pro/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /maybe later/i })
    ).toBeVisible();
  });

  test("PaywallModal Maybe Later closes the paywall without redirecting", async ({
    page,
  }) => {
    await setupAuth(page);

    await page.route("/api/properties", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Free limit reached.",
            code: "FREE_LIMIT_REACHED",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    await page.getByRole("button", { name: /save property/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Save Property" }).click();

    await expect(
      page.getByText(/all 3 free saves this month/i)
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /maybe later/i }).click();

    // Paywall closes; stay on /calculator
    await expect(
      page.getByText(/all 3 free saves this month/i)
    ).not.toBeVisible({ timeout: 3_000 });
    expect(page.url()).toContain("/calculator");
  });

  // ── Upgrade → checkout redirect ─────────────────────────────────────────────

  test("PaywallModal Upgrade to Pro calls /api/checkout and redirects to Stripe", async ({
    page,
  }) => {
    await setupAuth(page);

    await page.route("/api/properties", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Free limit reached.",
            code: "FREE_LIMIT_REACHED",
          }),
        });
      }
      return route.continue();
    });

    const STRIPE_CHECKOUT_URL =
      "https://checkout.stripe.com/pay/cs_test_e2e_abc123";

    await page.route("/api/checkout", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: STRIPE_CHECKOUT_URL }),
      })
    );

    // Intercept navigation to Stripe so the browser doesn't actually leave
    await page.route("**/checkout.stripe.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe Checkout (mocked)</body></html>",
      })
    );

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    await page.getByRole("button", { name: /save property/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Save Property" }).click();

    await expect(
      page.getByText(/all 3 free saves this month/i)
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /upgrade to pro/i }).click();

    // Browser should navigate to the Stripe checkout URL
    await page.waitForURL("**/checkout.stripe.com/**", { timeout: 8_000 });
    expect(page.url()).toContain("checkout.stripe.com");
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  test("Save button shows Saving... and is disabled while POST is in flight", async ({
    page,
  }) => {
    await setupAuth(page);

    // Slow POST — never resolves during the assertion window
    let resolveSave!: () => void;
    const savePending = new Promise<void>((r) => {
      resolveSave = r;
    });

    await page.route("/api/properties", async (route) => {
      if (route.request().method() === "POST") {
        await savePending; // hold until we release it
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ property: { id: "prop-2" } }),
        });
      }
      return route.continue();
    });

    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await waitForAuthenticated(page);

    await page.getByRole("button", { name: /save property/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Save Property" }).click();

    // While the POST is pending the main save button shows "Saving..."
    await expect(
      page.getByRole("button", { name: /saving\.\.\./i })
    ).toBeDisabled({ timeout: 5_000 });

    // Release the pending response to clean up
    resolveSave();
  });
});
