import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RentalComps from "@/components/calculator/RentalComps";

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPS_HIT = {
  available: true,
  source: "cache",
  comps: [{ beds: 2, rent: 1450, source: "HUD FMR FY2024" }],
  marketMedian: 1450,
  fetchedAt: "2024-01-01T00:00:00Z",
  zip_code: "94102",
  bedrooms: 2,
};

const COMPS_MISS = {
  available: false,
  zip_code: "00000",
  bedrooms: 2,
  message:
    "No market data available for this ZIP code. Run the seed script to populate HUD FMR data.",
};

function makeJsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RentalComps", () => {
  const defaultProps = {
    monthlyRent: 1600,
    onMedianFetched: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  it("renders the panel heading", () => {
    render(<RentalComps {...defaultProps} />);
    expect(screen.getByText("Rental Market Comps")).toBeInTheDocument();
  });

  it("renders the Max badge", () => {
    render(<RentalComps {...defaultProps} />);
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("renders the ZIP code input", () => {
    render(<RentalComps {...defaultProps} />);
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
  });

  it("renders the bedrooms selector", () => {
    render(<RentalComps {...defaultProps} />);
    expect(screen.getByLabelText(/beds/i)).toBeInTheDocument();
  });

  it("renders the Fetch button", () => {
    render(<RentalComps {...defaultProps} />);
    expect(screen.getByRole("button", { name: /fetch/i })).toBeInTheDocument();
  });

  it("disables the Fetch button when ZIP is not 5 digits", () => {
    render(<RentalComps {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /fetch/i });
    expect(btn).toBeDisabled();
  });

  it("enables the Fetch button once a 5-digit ZIP is entered", async () => {
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    expect(screen.getByRole("button", { name: /fetch/i })).toBeEnabled();
  });

  // ── Input sanitisation ──────────────────────────────────────────────────────

  it("strips non-digit characters from ZIP input", async () => {
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    const input = screen.getByLabelText(/zip code/i) as HTMLInputElement;
    await user.type(input, "9a4b1c02");
    expect(input.value).toBe("94102");
  });

  it("caps ZIP input at 5 characters", async () => {
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    const input = screen.getByLabelText(/zip code/i) as HTMLInputElement;
    await user.type(input, "941023333");
    expect(input.value).toBe("94102");
  });

  // ── Successful fetch ────────────────────────────────────────────────────────

  it("calls fetch with correct URL on button click", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT));
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("zip_code=94102")
    );
  });

  it("displays market median after successful fetch", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT));
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() =>
      expect(screen.getByText(/market benchmark/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/\$1,450/)).toBeInTheDocument();
  });

  it("calls onMedianFetched with marketMedian on success", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT));
    const onMedianFetched = vi.fn();
    const user = userEvent.setup();
    render(<RentalComps monthlyRent={1600} onMedianFetched={onMedianFetched} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() => expect(onMedianFetched).toHaveBeenCalledWith(1450));
  });

  it("shows the HUD FMR note after a successful fetch", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT));
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() =>
      expect(screen.getByText(/40th percentile/i)).toBeInTheDocument()
    );
  });

  // ── Above-market warning ────────────────────────────────────────────────────

  it("shows above-market warning when monthlyRent > 15% above median", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT)); // median = 1450
    const user = userEvent.setup();
    // monthlyRent = 1800 — that's 24% above 1450, triggers warning
    render(<RentalComps monthlyRent={1800} onMedianFetched={vi.fn()} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() =>
      expect(screen.getByText(/above market/i)).toBeInTheDocument()
    );
  });

  it("does not show above-market warning when rent is at or below median", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT)); // median = 1450
    const user = userEvent.setup();
    // monthlyRent = 1450 — exactly at median, no warning
    render(<RentalComps monthlyRent={1450} onMedianFetched={vi.fn()} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() =>
      expect(screen.getByText(/market benchmark/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/above market/i)).not.toBeInTheDocument();
  });

  // ── Cache miss ──────────────────────────────────────────────────────────────

  it("shows no-data message when API returns available:false", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_MISS));
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "00000");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() =>
      expect(screen.getByText(/No market data available/i)).toBeInTheDocument()
    );
  });

  it("calls onMedianFetched(null) when available:false", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_MISS));
    const onMedianFetched = vi.fn();
    const user = userEvent.setup();
    render(<RentalComps monthlyRent={1600} onMedianFetched={onMedianFetched} />);
    await user.type(screen.getByLabelText(/zip code/i), "00000");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() => expect(onMedianFetched).toHaveBeenCalledWith(null));
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it("shows error message when API returns a non-ok status", async () => {
    mockFetch.mockReturnValue(
      makeJsonResponse({ error: "Rental comps require a Max subscription." }, 403)
    );
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/Rental comps require a Max subscription./i)
      ).toBeInTheDocument()
    );
  });

  it("calls onMedianFetched(null) on API error", async () => {
    mockFetch.mockReturnValue(
      makeJsonResponse({ error: "Rental comps require a Max subscription." }, 403)
    );
    const onMedianFetched = vi.fn();
    const user = userEvent.setup();
    render(<RentalComps monthlyRent={1600} onMedianFetched={onMedianFetched} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() => expect(onMedianFetched).toHaveBeenCalledWith(null));
  });

  it("shows error message on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/Could not connect to market data service/i)
      ).toBeInTheDocument()
    );
  });

  // ── Enter key shortcut ──────────────────────────────────────────────────────

  it("submits when Enter is pressed in the ZIP input", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT));
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102{Enter}");
    await waitFor(() =>
      expect(screen.getByText(/market benchmark/i)).toBeInTheDocument()
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // ── Bedrooms selector ───────────────────────────────────────────────────────

  it("includes bedrooms value in the fetch URL", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(COMPS_HIT));
    const user = userEvent.setup();
    render(<RentalComps {...defaultProps} />);
    await user.type(screen.getByLabelText(/zip code/i), "94102");
    await user.selectOptions(screen.getByLabelText(/beds/i), "3");
    await user.click(screen.getByRole("button", { name: /fetch/i }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("bedrooms=3")
    );
  });

  it("shows Studio label for 0-bedroom selection", async () => {
    render(<RentalComps {...defaultProps} />);
    expect(screen.getByRole("option", { name: "Studio" })).toBeInTheDocument();
  });
});
