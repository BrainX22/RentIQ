import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock next/navigation ─────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/settings",
}));

// ── Mock child components as thin stubs ──────────────────────────────────────

vi.mock("@/components/settings/SettingsHeader", () => ({
  default: ({ displayName }: { displayName: string }) => (
    <div data-testid="settings-header">Welcome, {displayName}</div>
  ),
}));

let capturedOnDisplayNameUpdate: ((name: string) => void) | undefined;
vi.mock("@/components/settings/ProfileSection", () => ({
  default: ({
    displayName,
    onDisplayNameUpdate,
  }: {
    displayName: string;
    email: string;
    createdAt: string;
    onDisplayNameUpdate: (name: string) => void;
  }) => {
    capturedOnDisplayNameUpdate = onDisplayNameUpdate;
    return <div data-testid="profile-section">Profile: {displayName}</div>;
  },
}));

vi.mock("@/components/settings/SubscriptionSection", () => ({
  default: () => <div data-testid="subscription-section">Subscription</div>,
}));

vi.mock("@/components/settings/PropertiesPreview", () => ({
  default: () => <div data-testid="properties-preview">Properties</div>,
}));

vi.mock("@/components/settings/SecuritySection", () => ({
  default: () => <div data-testid="security-section">Security</div>,
}));

vi.mock("@/components/settings/DangerZone", () => ({
  default: () => <div data-testid="danger-zone">DangerZone</div>,
}));

// ── Mock fetch ───────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Import component under test AFTER mocks ──────────────────────────────────
import SettingsPage from "@/app/settings/page";

// ── Mock profile data ────────────────────────────────────────────────────────
const MOCK_PROFILE_DATA = {
  profile: {
    display_name: "TestUser",
    email: "test@example.com",
    created_at: "2025-01-15T00:00:00Z",
    auth_provider: "email" as const,
  },
  subscription: {
    plan_type: "pro" as const,
    status: "active",
    current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
    cancel_at_period_end: false,
    cancel_at: null,
  },
  usage: {
    saves_this_month: 3,
    total_properties: 5,
  },
  recent_properties: [
    {
      id: "prop-1",
      property_name: "123 Main St",
      monthly_cash_flow: 450,
      created_at: "2025-03-01T00:00:00Z",
    },
  ],
};

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDisplayNameUpdate = undefined;
  });

  it("shows loading skeleton initially", () => {
    // Never-resolving fetch to keep loading state visible
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<SettingsPage />);
    // Skeleton renders multiple skeleton pulse elements instead of text
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("redirects to login on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Could not load settings. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("shows error from API response", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 500,
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("renders all sections after successful fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => MOCK_PROFILE_DATA,
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Welcome, TestUser")).toBeInTheDocument();
    });

    expect(screen.getByTestId("settings-header")).toBeInTheDocument();
    expect(screen.getByTestId("profile-section")).toBeInTheDocument();
    expect(screen.getByTestId("subscription-section")).toBeInTheDocument();
    expect(screen.getByTestId("properties-preview")).toBeInTheDocument();
    expect(screen.getByTestId("security-section")).toBeInTheDocument();
    expect(screen.getByTestId("danger-zone")).toBeInTheDocument();
  });

  it("updates display name in header when ProfileSection saves", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => MOCK_PROFILE_DATA,
    });

    render(<SettingsPage />);

    // Wait for initial render with original name
    await waitFor(() => {
      expect(screen.getByText("Welcome, TestUser")).toBeInTheDocument();
    });

    // Simulate ProfileSection calling the onDisplayNameUpdate callback
    expect(capturedOnDisplayNameUpdate).toBeDefined();
    act(() => {
      capturedOnDisplayNameUpdate!("UpdatedUser");
    });

    await waitFor(() => {
      expect(screen.getByText("Welcome, UpdatedUser")).toBeInTheDocument();
    });
  });
});
