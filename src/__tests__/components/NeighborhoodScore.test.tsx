import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NeighborhoodScore from "@/components/calculator/NeighborhoodScore";

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GOOD_RESPONSE = {
  available: true,
  zip_code: "90210",
  scores: {
    composite: 78,
    safety: 80,
    income: 65,
    growth: 100,
    grade: "B",
    sources: ["crimegrade", "census", "fhfa"],
  },
  fetchedAt: "2026-03-01T00:00:00Z",
};

const LOW_SAFETY_RESPONSE = {
  available: true,
  zip_code: "90210",
  scores: {
    composite: 45,
    safety: 40,      // < 60 → advisory shown
    income: 55,
    growth: 30,
    grade: "D",
    sources: ["crimegrade", "census", "fhfa"],
  },
  fetchedAt: "2026-03-01T00:00:00Z",
};

const A_GRADE_RESPONSE = {
  available: true,
  zip_code: "94102",
  scores: {
    composite: 90,
    safety: 92,
    income: 85,
    growth: 94,
    grade: "A",
    sources: ["crimegrade", "census", "fhfa"],
  },
  fetchedAt: "2026-03-01T00:00:00Z",
};

const ALL_NULL_RESPONSE = {
  available: true,
  zip_code: "00000",
  scores: {
    composite: 50,
    safety: null,
    income: null,
    growth: null,
    grade: "C",
    sources: [],
  },
  fetchedAt: "2026-03-01T00:00:00Z",
};

const MISS_RESPONSE = { available: false };

function makeJsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
}

async function renderAndFetch(
  props: { vacancyPercent?: number; onApplySuggestion?: (n: number) => void } = {},
  zip = "90210"
) {
  const user = userEvent.setup();
  render(
    <NeighborhoodScore
      vacancyPercent={props.vacancyPercent ?? 5}
      onApplySuggestion={props.onApplySuggestion ?? vi.fn()}
    />
  );
  await user.type(screen.getByLabelText(/zip code/i), zip);
  await user.click(screen.getByRole("button", { name: /analyze/i }));
  return user;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NeighborhoodScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  it("renders the panel heading", () => {
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    expect(screen.getByText(/neighborhood score/i)).toBeInTheDocument();
  });

  it("renders the Max badge", () => {
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("renders a ZIP code input", () => {
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
  });

  it("renders the Analyze button", () => {
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    expect(screen.getByRole("button", { name: /analyze/i })).toBeInTheDocument();
  });

  it("disables Analyze button when ZIP is not 5 digits", () => {
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();
  });

  it("enables Analyze button once a 5-digit ZIP is entered", async () => {
    const user = userEvent.setup();
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    await user.type(screen.getByLabelText(/zip code/i), "90210");
    expect(screen.getByRole("button", { name: /analyze/i })).toBeEnabled();
  });

  // ── Input sanitisation ────────────────────────────────────────────────────

  it("strips non-digit characters from ZIP input", async () => {
    const user = userEvent.setup();
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    const input = screen.getByLabelText(/zip code/i) as HTMLInputElement;
    await user.type(input, "9a0b2c10");
    expect(input.value).toBe("90210");
  });

  it("caps ZIP input at 5 characters", async () => {
    const user = userEvent.setup();
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    const input = screen.getByLabelText(/zip code/i) as HTMLInputElement;
    await user.type(input, "902109999");
    expect(input.value).toBe("90210");
  });

  // ── Fetch mechanics ───────────────────────────────────────────────────────

  it("calls fetch with the correct neighborhood API URL", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    await renderAndFetch();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/neighborhood?zip_code=90210")
    );
  });

  it("submits on Enter key in the ZIP input", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    const user = userEvent.setup();
    render(<NeighborhoodScore vacancyPercent={5} onApplySuggestion={vi.fn()} />);
    await user.type(screen.getByLabelText(/zip code/i), "90210{Enter}");
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });

  // ── Grade display ─────────────────────────────────────────────────────────

  it("displays the grade badge after a successful fetch", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByTestId("grade-badge")).toBeInTheDocument()
    );
    expect(screen.getByTestId("grade-badge")).toHaveTextContent("B");
  });

  it("displays an A grade badge for a high-score response", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(A_GRADE_RESPONSE));
    await renderAndFetch({}, "94102");
    await waitFor(() =>
      expect(screen.getByTestId("grade-badge")).toHaveTextContent("A")
    );
  });

  it("displays the composite score", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/78/)).toBeInTheDocument()
    );
  });

  // ── Sub-score breakdowns ──────────────────────────────────────────────────

  it("displays Safety breakdown label", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/safety/i)).toBeInTheDocument()
    );
  });

  it("displays Income breakdown label", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/income/i)).toBeInTheDocument()
    );
  });

  it("displays Growth breakdown label", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/growth/i)).toBeInTheDocument()
    );
  });

  it("displays N/A for null sub-scores", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(ALL_NULL_RESPONSE));
    await renderAndFetch({}, "00000");
    await waitFor(() =>
      expect(screen.getAllByText(/n\/a/i).length).toBeGreaterThanOrEqual(1)
    );
  });

  // ── Safety advisory ───────────────────────────────────────────────────────

  it("shows safety advisory when safety score < 60", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(LOW_SAFETY_RESPONSE));
    await renderAndFetch({ vacancyPercent: 5 });
    await waitFor(() =>
      expect(screen.getByText(/high vacancy risk/i)).toBeInTheDocument()
    );
  });

  it("suggests current+3% vacancy in the advisory", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(LOW_SAFETY_RESPONSE));
    await renderAndFetch({ vacancyPercent: 5 });
    await waitFor(() =>
      // advisory mentions the suggested value: 5 + 3 = 8
      expect(screen.getByText(/8%/i)).toBeInTheDocument()
    );
  });

  it("shows the Apply Suggestion button when safety < 60", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(LOW_SAFETY_RESPONSE));
    await renderAndFetch({ vacancyPercent: 5 });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /apply suggestion/i })).toBeInTheDocument()
    );
  });

  it("calls onApplySuggestion with current+3 when Apply Suggestion clicked", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(LOW_SAFETY_RESPONSE));
    const onApplySuggestion = vi.fn();
    const user = userEvent.setup();
    render(
      <NeighborhoodScore vacancyPercent={5} onApplySuggestion={onApplySuggestion} />
    );
    await user.type(screen.getByLabelText(/zip code/i), "90210");
    await user.click(screen.getByRole("button", { name: /analyze/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /apply suggestion/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /apply suggestion/i }));
    expect(onApplySuggestion).toHaveBeenCalledWith(8);
  });

  it("does not show safety advisory when safety >= 60", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE)); // safety = 80
    await renderAndFetch({ vacancyPercent: 5 });
    await waitFor(() =>
      expect(screen.getByTestId("grade-badge")).toBeInTheDocument()
    );
    expect(screen.queryByText(/high vacancy risk/i)).not.toBeInTheDocument();
  });

  it("does not show advisory when safety is null", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(ALL_NULL_RESPONSE));
    await renderAndFetch({}, "00000");
    await waitFor(() =>
      expect(screen.getByTestId("grade-badge")).toBeInTheDocument()
    );
    expect(screen.queryByText(/high vacancy risk/i)).not.toBeInTheDocument();
  });

  // ── Available false ───────────────────────────────────────────────────────

  it("shows unavailable message when available:false", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(MISS_RESPONSE));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/not available/i)).toBeInTheDocument()
    );
  });

  // ── Error states ──────────────────────────────────────────────────────────

  it("shows error message on API 403", async () => {
    mockFetch.mockReturnValue(
      makeJsonResponse({ error: "Neighborhood scoring requires a Max subscription." }, 403)
    );
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/Max subscription/i)).toBeInTheDocument()
    );
  });

  it("shows generic error message on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/could not connect/i)).toBeInTheDocument()
    );
  });

  it("shows error when API returns malformed data", async () => {
    mockFetch.mockReturnValue(makeJsonResponse({ unexpected: true }));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/unexpected data/i)).toBeInTheDocument()
    );
  });

  // ── Sources ───────────────────────────────────────────────────────────────

  it("displays data sources note when sources array is non-empty", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(GOOD_RESPONSE));
    await renderAndFetch();
    await waitFor(() =>
      expect(screen.getByText(/crimegrade/i)).toBeInTheDocument()
    );
  });

  it("does not show sources note when all sources failed", async () => {
    mockFetch.mockReturnValue(makeJsonResponse(ALL_NULL_RESPONSE));
    await renderAndFetch({}, "00000");
    await waitFor(() =>
      expect(screen.getByTestId("grade-badge")).toBeInTheDocument()
    );
    expect(screen.queryByText(/crimegrade/i)).not.toBeInTheDocument();
  });
});
