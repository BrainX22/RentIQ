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

// ─── PGRST "no rows" response (maybeSingle → null) ────────────────────────────
const PGRST_NO_ROWS = {
  code: "PGRST116",
  details: "The result contains 0 rows",
  hint: null,
  message: "JSON object requested, multiple (or no) rows returned",
};

// ─── Mock property fixtures ────────────────────────────────────────────────────

const MOCK_PROPERTY_1 = {
  id: "prop-uuid-1",
  user_id: MOCK_USER.id,
  property_name: "123 Elm Street",
  property_price: 250_000,
  down_payment_percent: 20,
  interest_rate: 7,
  loan_term_years: 30,
  monthly_rent: 2_200,
  property_tax_yearly: 3_000,
  insurance_monthly: 120,
  hoa_fees_monthly: 0,
  maintenance_percent: 10,
  vacancy_percent: 8,
  monthly_cash_flow: 285,
  annual_cash_flow: 3_420,
  cash_on_cash_return: 6.84,
  noi: 12_780,
  monthly_mortgage: 1_329,
  created_at: "2024-03-01T10:00:00.000Z",
  updated_at: "2024-03-01T10:00:00.000Z",
};

const MOCK_PROPERTY_2 = {
  id: "prop-uuid-2",
  user_id: MOCK_USER.id,
  property_name: "456 Oak Avenue",
  property_price: 180_000,
  down_payment_percent: 25,
  interest_rate: 6.5,
  loan_term_years: 30,
  monthly_rent: 1_600,
  property_tax_yearly: 2_100,
  insurance_monthly: 90,
  hoa_fees_monthly: 50,
  maintenance_percent: 10,
  vacancy_percent: 8,
  monthly_cash_flow: -45,
  annual_cash_flow: -540,
  cash_on_cash_return: -0.99,
  noi: 9_300,
  monthly_mortgage: 908,
  created_at: "2024-02-15T14:30:00.000Z",
  updated_at: "2024-02-15T14:30:00.000Z",
};

// ─── Auth + route helpers ──────────────────────────────────────────────────────

/**
 * Injects a fake Supabase session so the browser client treats the user as
 * authenticated.
 *
 * @supabase/ssr v0.9.0 stores sessions as "base64-" + base64url(sessionJSON)
 * under the storage key cookie (no ".0" suffix for single-chunk sessions).
 * Setting this before page.goto() ensures onAuthStateChange fires with the
 * session immediately — preventing the dashboard's auth redirect.
 *
 * Must be called before page.goto().
 */
async function setupAuth(page: Page): Promise<void> {
  // ── Inject auth cookie in @supabase/ssr v0.9.0 format ─────────────────────
  const sessionJson = JSON.stringify(FAKE_SESSION);
  const base64url = Buffer.from(sessionJson, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const cookieValue = `base64-${base64url}`;
  const storageKey = `sb-${PROJECT_REF}-auth-token`;

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

  // Mock session validation — called after init regardless of stored session
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    })
  );

  // Token refresh fallback
  await page.route(`${SUPABASE_URL}/auth/v1/token*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_SESSION),
    })
  );
}

/**
 * Mocks all API endpoints the dashboard calls on load.
 * Callers can supply overrides to test specific states.
 */
async function mockDashboardApis(
  page: Page,
  opts: {
    properties?: object[];
    subscription?: object | null;
    usageCount?: number | null;
    watchlistCriteria?: object | null;
  } = {}
): Promise<void> {
  const {
    properties = [],
    subscription = null,
    usageCount = null,
    watchlistCriteria = null,
  } = opts;

  // GET /api/properties
  await page.route("/api/properties", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ properties }),
      });
    }
    return route.continue();
  });

  // GET /api/watchlist-criteria
  await page.route("/api/watchlist-criteria", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ criteria: watchlistCriteria }),
      });
    }
    // PUT — allow to fall through to per-test mocks
    return route.continue();
  });

  // GET /api/daily-digest
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

  // Supabase subscriptions (maybeSingle: object or PGRST116 → null)
  await page.route(`${SUPABASE_URL}/rest/v1/subscriptions*`, (route) => {
    if (!subscription) {
      return route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify(PGRST_NO_ROWS),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(subscription),
    });
  });

  // Supabase usage_tracking (maybeSingle: object or PGRST116 → null)
  await page.route(`${SUPABASE_URL}/rest/v1/usage_tracking*`, (route) => {
    if (usageCount === null) {
      return route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify(PGRST_NO_ROWS),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ calculation_count: usageCount }),
    });
  });
}

/** Waits for the dashboard to finish loading (spinner disappears). */
async function waitForDashboardLoaded(page: Page): Promise<void> {
  await expect(page.getByText("Loading dashboard...")).not.toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("heading", { name: /your saved properties/i })
  ).toBeVisible({ timeout: 8_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Dashboard — authenticated with mocked API", () => {
  // ── Page structure ──────────────────────────────────────────────────────────

  test("renders Your Saved Properties heading", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page);
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(
      page.getByRole("heading", { name: /your saved properties/i })
    ).toBeVisible();
  });

  test("renders Watchlist Criteria section", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page);
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(
      page.getByRole("heading", { name: /watchlist criteria/i })
    ).toBeVisible();
    await expect(page.getByLabel("City")).toBeVisible();
    await expect(page.getByLabel("Max Price")).toBeVisible();
  });

  test("renders New Matches Feed section", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page);
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(
      page.getByRole("heading", { name: /new matches feed/i })
    ).toBeVisible();
  });

  // ── Free user badge ─────────────────────────────────────────────────────────

  test("free user with 0 saves shows usage badge", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { usageCount: 0 });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(
      page.getByText(/0 of 3 free saves used this month/i)
    ).toBeVisible();
  });

  test("free user with 2 saves shows correct usage count", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { usageCount: 2 });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(
      page.getByText(/2 of 3 free saves used this month/i)
    ).toBeVisible();
  });

  // ── Pro user badge ──────────────────────────────────────────────────────────

  test("pro user shows Pro badge", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page, {
      subscription: {
        plan_type: "pro",
        cancel_at_period_end: false,
        cancel_at: null,
        current_period_end: null,
      },
    });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    // Pro badge appears in the header area
    await expect(page.getByText(/^pro$/i)).toBeVisible();
  });

  test("pro user sees Manage Subscription button", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page, {
      subscription: {
        plan_type: "pro",
        cancel_at_period_end: false,
        cancel_at: null,
        current_period_end: null,
      },
    });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(
      page.getByRole("button", { name: /manage subscription/i })
    ).toBeVisible();
  });

  test("pro user with cancellation shows cancel date in Pro badge", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, {
      subscription: {
        plan_type: "pro",
        cancel_at_period_end: true,
        cancel_at: null,
        current_period_end: "2026-04-30T00:00:00.000Z",
      },
    });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    // Badge shows "Pro - cancels on Apr 30"
    await expect(page.getByText(/pro.*cancels on/i)).toBeVisible();
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  test("shows empty state when there are no saved properties", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { properties: [] });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(
      page.getByText(/no properties saved yet/i)
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /analyze your first property/i })
    ).toBeVisible();
  });

  // ── Property cards ──────────────────────────────────────────────────────────

  test("renders property cards when API returns properties", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, {
      properties: [MOCK_PROPERTY_1, MOCK_PROPERTY_2],
    });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(page.getByText("123 Elm Street")).toBeVisible();
    await expect(page.getByText("456 Oak Avenue")).toBeVisible();
  });

  test("positive cash flow card shows 'Cash Flow +' badge", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { properties: [MOCK_PROPERTY_1] });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    // MOCK_PROPERTY_1 has monthly_cash_flow: 285 (positive)
    await expect(page.getByText("Cash Flow +")).toBeVisible();
  });

  test("negative cash flow card shows 'Cash Flow -' badge", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { properties: [MOCK_PROPERTY_2] });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    // MOCK_PROPERTY_2 has monthly_cash_flow: -45 (negative)
    await expect(page.getByText("Cash Flow -")).toBeVisible();
  });

  test("property card shows deal score badge", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { properties: [MOCK_PROPERTY_1] });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    // Deal score badge format: "Score A", "Score B", etc.
    await expect(page.getByText(/^Score [A-D]$/)).toBeVisible();
  });

  test("View Details expands the property card detail panel", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { properties: [MOCK_PROPERTY_1] });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await page.getByRole("button", { name: "View Details" }).click();

    // Expanded panel shows Annual Cash Flow and NOI
    await expect(page.getByText("Annual Cash Flow")).toBeVisible();
    await expect(page.getByText("NOI (Annual)")).toBeVisible();
  });

  // ── Delete property ─────────────────────────────────────────────────────────

  test("Delete button removes property from the list after confirmation", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, {
      properties: [MOCK_PROPERTY_1, MOCK_PROPERTY_2],
    });

    // Mock the DELETE endpoint
    await page.route(`/api/properties/${MOCK_PROPERTY_1.id}`, (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    // Accept the window.confirm dialog that PropertyCard shows before deleting
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(page.getByText("123 Elm Street")).toBeVisible();

    // Click Delete on the card containing "123 Elm Street"
    await page
      .locator("div.rounded-xl")
      .filter({ hasText: "123 Elm Street" })
      .getByRole("button", { name: "Delete" })
      .click();

    // After deletion, that card should disappear
    await expect(page.getByText("123 Elm Street")).not.toBeVisible({
      timeout: 5_000,
    });
    // Other property remains
    await expect(page.getByText("456 Oak Avenue")).toBeVisible();
  });

  test("dismissing the delete confirmation keeps the property in the list", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page, { properties: [MOCK_PROPERTY_1] });

    // Dismiss the confirm dialog
    page.on("dialog", (dialog) => dialog.dismiss());

    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(page.getByText("123 Elm Street")).toBeVisible();

    await page
      .locator("div.rounded-xl")
      .filter({ hasText: "123 Elm Street" })
      .getByRole("button", { name: "Delete" })
      .click();

    // Property should still be there after dismissing the confirm
    await expect(page.getByText("123 Elm Street")).toBeVisible();
  });

  // ── Watchlist criteria ──────────────────────────────────────────────────────

  test("watchlist form populates from API response", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page, {
      watchlistCriteria: {
        city: "Austin",
        maxPrice: 400_000,
        minTargetReturn: 8,
      },
    });
    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await expect(page.getByLabel("City")).toHaveValue("Austin");
    await expect(page.getByLabel("Max Price")).toHaveValue("400000");
  });

  test("Save Watchlist Filters button calls PUT /api/watchlist-criteria", async ({
    page,
  }) => {
    await setupAuth(page);
    await mockDashboardApis(page);

    let capturedBody: unknown = null;
    await page.route("/api/watchlist-criteria", (route) => {
      if (route.request().method() === "PUT") {
        capturedBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            criteria: { city: "Denver", maxPrice: 350000, minTargetReturn: 7 },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ criteria: null }),
      });
    });

    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    // Fill in the watchlist form
    await page.getByLabel("City").fill("Denver");
    await page.getByLabel("Max Price").fill("350000");
    await page.getByLabel(/min target return/i).fill("7");

    await page.getByRole("button", { name: /save watchlist filters/i }).click();

    // PUT should have been called with our values
    await expect
      .poll(() => capturedBody, { timeout: 5_000 })
      .toMatchObject({ city: "Denver", maxPrice: 350000, minTargetReturn: 7 });
  });

  // ── Billing portal redirect ─────────────────────────────────────────────────

  test("Manage Subscription opens the billing portal URL", async ({ page }) => {
    await setupAuth(page);
    await mockDashboardApis(page, {
      subscription: {
        plan_type: "pro",
        cancel_at_period_end: false,
        cancel_at: null,
        current_period_end: null,
      },
    });

    const PORTAL_URL = "https://billing.stripe.com/p/session/test_portal";

    await page.route("/api/billing-portal", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: PORTAL_URL }),
      })
    );

    // Intercept navigation to Stripe billing portal
    await page.route("**/billing.stripe.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe Billing Portal (mocked)</body></html>",
      })
    );

    await page.goto("/dashboard");
    await waitForDashboardLoaded(page);

    await page.getByRole("button", { name: /manage subscription/i }).click();

    // Should navigate to the billing portal
    await page.waitForURL("**/billing.stripe.com/**", { timeout: 8_000 });
    expect(page.url()).toContain("billing.stripe.com");
  });
});
