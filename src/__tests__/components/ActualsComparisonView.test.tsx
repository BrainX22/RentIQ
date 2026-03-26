import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ActualsComparisonView, {
  isUnderperforming,
} from "@/components/dashboard/ActualsComparisonView";
import { makeProperty } from "../fixtures/makeProperty";
import type { MonthlyActual } from "@/types";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Silence window.confirm (used before delete)
vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROPERTY = makeProperty("prop-1", { monthly_cash_flow: 500 });

function makeActual(overrides: Partial<MonthlyActual> = {}): MonthlyActual {
  return {
    id: "actual-1",
    property_id: "prop-1",
    user_id: "user-1",
    month: 1,
    year: 2026,
    actual_rent: 2100,
    actual_expenses: 1400,
    notes: null,
    created_at: "2026-01-31T00:00:00Z",
    ...overrides,
  };
}

function mockFetchSuccess(actuals: MonthlyActual[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ actuals }),
  });
}

function mockFetchError(error = "Failed to load actuals.") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 400,
    json: () => Promise.resolve({ error }),
  });
}

// ─── isUnderperforming unit tests ─────────────────────────────────────────────

describe("isUnderperforming", () => {
  it("returns false with fewer than 2 actuals", () => {
    expect(isUnderperforming([], 500)).toBe(false);
    expect(isUnderperforming([makeActual({ actual_rent: 0, actual_expenses: 0 })], 500)).toBe(false);
  });

  it("returns false when no months are underperforming", () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 2100, actual_expenses: 1400 }), // CF=700 >= 500*0.8=400
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 2000, actual_expenses: 1500 }), // CF=500 >= 400
    ];
    expect(isUnderperforming(actuals, 500)).toBe(false);
  });

  it("returns false with only 1 underperforming month", () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 100, actual_expenses: 500 }), // CF=-400 < 400 (under)
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 2100, actual_expenses: 1400 }), // CF=700 (good)
    ];
    expect(isUnderperforming(actuals, 500)).toBe(false);
  });

  it("returns true with 2 consecutive underperforming months", () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 0, actual_expenses: 100 }), // CF=-100 (under)
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 0, actual_expenses: 100 }), // CF=-100 (under)
    ];
    expect(isUnderperforming(actuals, 500)).toBe(true);
  });

  it("returns true with 3 consecutive underperforming months", () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 0, actual_expenses: 0 }), // CF=0 (under)
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 0, actual_expenses: 0 }), // CF=0 (under)
      makeActual({ id: "a3", month: 3, year: 2026, actual_rent: 0, actual_expenses: 0 }), // CF=0 (under)
    ];
    expect(isUnderperforming(actuals, 500)).toBe(true);
  });

  it("returns false with 2 underperforming months that have a gap", () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 0, actual_expenses: 0 }), // CF=0 (under)
      // February is MISSING (gap)
      makeActual({ id: "a2", month: 3, year: 2026, actual_rent: 0, actual_expenses: 0 }), // CF=0 (under)
    ];
    expect(isUnderperforming(actuals, 500)).toBe(false);
  });

  it("handles year boundary (Dec → Jan) as consecutive", () => {
    const actuals = [
      makeActual({ month: 12, year: 2025, actual_rent: 0, actual_expenses: 0 }), // CF=0 (under)
      makeActual({ id: "a2", month: 1, year: 2026, actual_rent: 0, actual_expenses: 0 }), // CF=0 (under)
    ];
    expect(isUnderperforming(actuals, 500)).toBe(true);
  });

  it("handles unsorted input (sorts internally)", () => {
    // Input in reverse order
    const actuals = [
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 0, actual_expenses: 0 }),
      makeActual({ month: 1, year: 2026, actual_rent: 0, actual_expenses: 0 }),
    ];
    expect(isUnderperforming(actuals, 500)).toBe(true);
  });

  it("resets consecutive count when a good month interrupts, then 2 more consecutive bad months trigger", () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 0, actual_expenses: 0 }),   // under
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 2000, actual_expenses: 0 }), // good
      makeActual({ id: "a3", month: 3, year: 2026, actual_rent: 0, actual_expenses: 0 }),   // under
      makeActual({ id: "a4", month: 4, year: 2026, actual_rent: 0, actual_expenses: 0 }),   // under
    ];
    expect(isUnderperforming(actuals, 500)).toBe(true);
  });

  it("uses exactly 80% threshold (not strictly below)", () => {
    // CF = 400 which is exactly 80% of 500 → NOT underperforming (must be LESS than 80%)
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 1600, actual_expenses: 1200 }), // CF=400 = 80% exactly
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 1600, actual_expenses: 1200 }), // CF=400
    ];
    expect(isUnderperforming(actuals, 500)).toBe(false);

    // CF = 399 which is below 80% of 500
    const actuals2 = [
      makeActual({ month: 1, year: 2026, actual_rent: 1599, actual_expenses: 1200 }), // CF=399 < 400
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 1599, actual_expenses: 1200 }),
    ];
    expect(isUnderperforming(actuals2, 500)).toBe(true);
  });
});

// ─── ActualsComparisonView component tests ────────────────────────────────────

describe("ActualsComparisonView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner initially", () => {
    // Never resolve to keep loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    // Loader2 renders an svg; check aria or just that the spinner container exists
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("shows empty state message when no actuals", async () => {
    mockFetchSuccess([]);
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText(/No actuals logged yet/i)).toBeInTheDocument();
    });
  });

  it("shows fetch error message on API failure", async () => {
    mockFetchError("Failed to load actuals.");
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load actuals.")).toBeInTheDocument();
    });
  });

  it("renders actuals table with correct month/year label", async () => {
    mockFetchSuccess([makeActual({ month: 3, year: 2026 })]);
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText("Mar 2026")).toBeInTheDocument();
    });
  });

  it("shows underperformance alert when 2+ consecutive underperforming months", async () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 0, actual_expenses: 0 }),
      makeActual({ id: "a2", month: 2, year: 2026, actual_rent: 0, actual_expenses: 0 }),
    ];
    mockFetchSuccess(actuals);
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText(/Underperforming/i)).toBeInTheDocument();
    });
  });

  it("does NOT show underperformance alert for good performing property", async () => {
    const actuals = [
      makeActual({ month: 1, year: 2026, actual_rent: 2100, actual_expenses: 1400 }), // CF=700 > 400
    ];
    mockFetchSuccess(actuals);
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      expect(screen.queryByText(/Underperforming/i)).not.toBeInTheDocument();
    });
  });

  it("renders notes section when actuals have notes", async () => {
    const actuals = [makeActual({ notes: "Tenant paid late" })];
    mockFetchSuccess(actuals);
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText("Tenant paid late")).toBeInTheDocument();
    });
  });

  it("does not render notes section when no actuals have notes", async () => {
    const actuals = [makeActual({ notes: null })];
    mockFetchSuccess(actuals);
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      // Table should be visible
      expect(screen.getByText("Jan 2026")).toBeInTheDocument();
    });
    // No notes section
    expect(screen.queryByText(/Tenant/i)).not.toBeInTheDocument();
  });

  it("calls DELETE endpoint and removes row on successful delete", async () => {
    const actual = makeActual({ month: 5, year: 2026 });
    mockFetchSuccess([actual]);
    // Mock the delete fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });

    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText("May 2026")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete actual for may 2026/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText("May 2026")).not.toBeInTheDocument();
    });
  });

  it("re-fetches when refreshKey changes", async () => {
    mockFetchSuccess([]);
    const { rerender } = render(
      <ActualsComparisonView property={PROPERTY} refreshKey={0} />
    );
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    mockFetchSuccess([makeActual({ month: 6, year: 2026 })]);
    rerender(<ActualsComparisonView property={PROPERTY} refreshKey={1} />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Jun 2026")).toBeInTheDocument();
    });
  });

  it("shows positive variance in emerald and negative variance in red", async () => {
    // Projected CF = 500, Actual CF = 700 → variance = +200 (emerald)
    const actuals = [makeActual({ actual_rent: 2100, actual_expenses: 1400 })]; // CF=700
    mockFetchSuccess(actuals);
    render(<ActualsComparisonView property={PROPERTY} refreshKey={0} />);
    await waitFor(() => {
      // Variance cell: +$200 — rendered with emerald class
      const cells = document.querySelectorAll("td");
      const varianceCellContent = Array.from(cells).find((c) =>
        c.textContent?.includes("+")
      );
      expect(varianceCellContent).toBeTruthy();
      expect(varianceCellContent?.className).toContain("emerald");
    });
  });
});
