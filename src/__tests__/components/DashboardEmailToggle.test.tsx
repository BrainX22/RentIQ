import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-123" }, isLoading: false }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFetchMock({
  planType = "free",
  emailDigest = false,
}: {
  planType?: "free" | "pro" | "max";
  emailDigest?: boolean;
} = {}) {
  // /api/properties
  const propertiesRes = new Response(JSON.stringify({ properties: [] }), { status: 200 });
  // /api/watchlist-criteria
  const criteriaRes = new Response(
    JSON.stringify({
      criteria: { city: "Austin", maxPrice: null, minTargetReturn: null, emailDigest },
    }),
    { status: 200 }
  );
  // /api/daily-digest
  const digestRes = new Response(
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      windowHours: 24,
      totalNewProperties: 0,
      matches: [],
      notes: [],
    }),
    { status: 200 }
  );

  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/properties")) return Promise.resolve(propertiesRes);
    if (url.includes("/api/watchlist-criteria")) return Promise.resolve(criteriaRes);
    if (url.includes("/api/daily-digest")) return Promise.resolve(digestRes);
    return Promise.resolve(new Response("{}", { status: 200 }));
  });

  // subscriptions + usage_tracking from Supabase client
  mockFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan_type: planType, cancel_at_period_end: false, cancel_at: null, current_period_end: null },
              error: null,
            }),
          }),
        }),
      };
    }
    // usage_tracking
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { calculation_count: 0 }, error: null }),
          }),
        }),
      }),
    };
  });
}

async function renderDashboard() {
  // Dynamic import to avoid module-level side effects before mocks are set up
  const { default: DashboardPage } = await import("@/app/dashboard/page");
  const utils = render(<DashboardPage />);
  return utils;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Dashboard email digest toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("email toggle is visible for Max users", async () => {
    buildFetchMock({ planType: "max", emailDigest: false });
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByLabelText("Email me daily when new A/B deals are found")).toBeInTheDocument();
    });
  });

  it("email toggle is NOT visible for Free users", async () => {
    buildFetchMock({ planType: "free", emailDigest: false });
    await renderDashboard();

    await waitFor(() => {
      // Wait for loading to complete by checking something that appears post-load
      expect(screen.queryByText("Your Saved Properties")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Email me daily when new A/B deals are found")).not.toBeInTheDocument();
  });

  it("email toggle is NOT visible for Pro users", async () => {
    buildFetchMock({ planType: "pro", emailDigest: false });
    await renderDashboard();

    await waitFor(() => {
      expect(screen.queryByText("Your Saved Properties")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Email me daily when new A/B deals are found")).not.toBeInTheDocument();
  });

  it("email toggle reflects stored emailDigest value (true)", async () => {
    buildFetchMock({ planType: "max", emailDigest: true });
    await renderDashboard();

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox", { name: /email me daily/i }) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  it("toggling the checkbox updates local state to checked", async () => {
    buildFetchMock({ planType: "max", emailDigest: false });
    await renderDashboard();

    const checkbox = await screen.findByRole("checkbox", { name: /email me daily/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(true);
  });

  it("toggling the checkbox from checked to unchecked updates local state", async () => {
    buildFetchMock({ planType: "max", emailDigest: true });
    await renderDashboard();

    const checkbox = await screen.findByRole("checkbox", { name: /email me daily/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(false);
  });

  it("Save button becomes enabled when only emailDigest is toggled (Max user)", async () => {
    buildFetchMock({ planType: "max", emailDigest: false });
    await renderDashboard();

    // Wait for loading to finish and saved state to be set (emailDigest=false saved)
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /email me daily/i })).toBeInTheDocument();
    });

    // Initially the save button should be disabled (no unsaved changes)
    const saveButton = screen.getByRole("button", { name: /saved/i });
    expect(saveButton).toBeDisabled();

    // Toggle only the emailDigest checkbox
    const checkbox = screen.getByRole("checkbox", { name: /email me daily/i }) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // Save button should now be enabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save watchlist filters/i })).not.toBeDisabled();
    });
  });
});
