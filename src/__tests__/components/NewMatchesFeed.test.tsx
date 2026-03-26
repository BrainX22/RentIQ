import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import NewMatchesFeed from "@/components/dashboard/NewMatchesFeed";
import type { DealMatch } from "@/types";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDealMatch(overrides?: Partial<DealMatch>): DealMatch {
  return {
    id: "match-1",
    user_id: "user-1",
    property_id: "prop-1",
    property_name: "123 Main St",
    property_price: 350000,
    est_monthly_cash_flow: 450,
    est_cash_on_cash_return: 8.5,
    deal_score_value: 78,
    deal_grade: "A",
    matched_at: "2026-03-21T10:00:00.000Z",
    dismissed_at: null,
    ...overrides,
  };
}

function mockFetchSuccess(matches: DealMatch[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: { matches } }),
  });
}

function mockFetchError(error = "Failed to load matches.") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NewMatchesFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders upgrade prompt for planType="free" (no fetch called)
  it("renders upgrade prompt for free plan without fetching", () => {
    render(<NewMatchesFeed planType="free" />);

    expect(screen.getByText(/upgrade to max/i)).toBeInTheDocument();
    expect(screen.getByText(/deal finder/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // 2. Renders upgrade prompt for planType="pro" (no fetch called)
  it("renders upgrade prompt for pro plan without fetching", () => {
    render(<NewMatchesFeed planType="pro" />);

    expect(screen.getByText(/upgrade to max/i)).toBeInTheDocument();
    expect(screen.getByText(/deal finder/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // 3. Shows loading spinner while fetching (Max plan)
  it("shows loading spinner while fetching for max plan", () => {
    // Never resolves during this test
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<NewMatchesFeed planType="max" />);

    // The spinner should be visible
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  // 4. Shows matches after successful fetch (Max plan, 2 mock matches)
  it("shows matches after successful fetch for max plan", async () => {
    const matches = [
      makeDealMatch({ id: "match-1", property_name: "123 Main St" }),
      makeDealMatch({ id: "match-2", property_name: "456 Oak Ave", deal_grade: "B", deal_score_value: 65 }),
    ];
    mockFetchSuccess(matches);

    render(<NewMatchesFeed planType="max" />);

    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    expect(screen.getByText("456 Oak Ave")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/deal-matches", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  // 5. Renders correct grade badge colors (A=emerald, B=blue)
  it("renders correct grade badge colors for A and B grades", async () => {
    const matches = [
      makeDealMatch({ id: "match-1", deal_grade: "A", deal_score_value: 82 }),
      makeDealMatch({ id: "match-2", deal_grade: "B", deal_score_value: 65 }),
    ];
    mockFetchSuccess(matches);

    render(<NewMatchesFeed planType="max" />);

    await waitFor(() => {
      expect(screen.getByText("A (82)")).toBeInTheDocument();
    });

    expect(screen.getByText("B (65)")).toBeInTheDocument();

    // A grade badge should have emerald color classes
    const aBadge = screen.getByText("A (82)");
    expect(aBadge.className).toMatch(/emerald/);

    // B grade badge should have blue color classes
    const bBadge = screen.getByText("B (65)");
    expect(bBadge.className).toMatch(/blue/);
  });

  // 6. Shows empty state when no matches returned
  it("shows empty state when no matches returned", async () => {
    mockFetchSuccess([]);

    render(<NewMatchesFeed planType="max" />);

    await waitFor(() => {
      expect(screen.getByText(/no deal matches yet/i)).toBeInTheDocument();
    });
  });

  // 7. Shows error state when fetch fails
  it("shows error state when fetch fails", async () => {
    mockFetchError("Failed to load matches.");

    render(<NewMatchesFeed planType="max" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load matches/i)).toBeInTheDocument();
    });
  });

  // 8. Dismiss removes match optimistically and calls PATCH
  it("dismisses a match optimistically and calls PATCH", async () => {
    const match = makeDealMatch({ id: "match-1", property_name: "123 Main St" });
    mockFetchSuccess([match]);

    // Mock the PATCH response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { dismissed: true } }),
    });

    render(<NewMatchesFeed planType="max" />);

    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    // Click the dismiss button
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Match should be optimistically removed
    expect(screen.queryByText("123 Main St")).not.toBeInTheDocument();

    // PATCH should have been called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/deal-matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: "match-1" }),
      });
    });
  });

  // 9. Restores match if PATCH fails
  it("restores dismissed match if PATCH fails", async () => {
    const match = makeDealMatch({ id: "match-1", property_name: "123 Main St" });
    mockFetchSuccess([match]);

    // Mock the PATCH response — fail
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<NewMatchesFeed planType="max" />);

    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    // Click the dismiss button
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Match should be restored after PATCH failure
    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    // Dismiss error message should be shown (server error message from mock response)
    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
  });

  // 10. Shows "View Property" link pointing to correct anchor
  it("renders View Property link with correct href", async () => {
    const match = makeDealMatch({ id: "match-1", property_id: "prop-abc" });
    mockFetchSuccess([match]);

    render(<NewMatchesFeed planType="max" />);

    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /view property/i });
    expect(link).toHaveAttribute("href", "/calculator?load=prop-abc");
  });
});
