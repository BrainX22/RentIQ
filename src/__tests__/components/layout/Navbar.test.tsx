import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/settings",
}));

const mockUser = {
  id: "user-123",
  email: "alice@example.com",
  user_metadata: { display_name: "Alice" },
  app_metadata: {},
};

const { mockUseUser } = vi.hoisted(() => ({
  mockUseUser: vi.fn(),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: mockUseUser,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
  }),
}));

import Navbar from "@/components/layout/Navbar";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Settings link for authenticated users", () => {
    mockUseUser.mockReturnValue({ user: mockUser, isLoading: false });

    render(<Navbar />);

    const settingsLink = screen.getByRole("link", { name: /Settings/i });
    expect(settingsLink).toBeDefined();
    expect(settingsLink.getAttribute("href")).toBe("/settings");
  });

  it("does not show Settings link for unauthenticated users", () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: false });

    render(<Navbar />);

    const settingsLink = screen.queryByRole("link", { name: /Settings/i });
    expect(settingsLink).toBeNull();
  });

  it("shows 'Welcome, displayName' from user_metadata", () => {
    mockUseUser.mockReturnValue({ user: mockUser, isLoading: false });

    render(<Navbar />);

    expect(screen.getByText("Welcome, Alice")).toBeDefined();
  });

  it("falls back to email-derived name when no display_name in metadata", () => {
    const userWithoutDisplayName = {
      ...mockUser,
      email: "bob@example.com",
      user_metadata: {},
    };
    mockUseUser.mockReturnValue({ user: userWithoutDisplayName, isLoading: false });

    render(<Navbar />);

    expect(screen.getByText("Welcome, Bob")).toBeDefined();
  });

  it("shows loading state when isLoading is true", () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: true });

    render(<Navbar />);

    expect(screen.getByText("Loading")).toBeDefined();
  });

  it("shows How it works link for unauthenticated users", () => {
    mockUseUser.mockReturnValue({ user: null, isLoading: false });

    render(<Navbar />);

    const link = screen.getByRole("link", { name: /how it works/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/how-it-works");
  });
});
