import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogActualsModal from "@/components/dashboard/LogActualsModal";

// ─── Global fetch mock ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Mock sonner ──────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Default props ────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  open: true,
  onOpenChange: vi.fn(),
  propertyId: "550e8400-e29b-41d4-a716-446655440000",
  onSuccess: vi.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderModal(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  const props = { ...DEFAULT_PROPS, ...overrides };
  return render(<LogActualsModal {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LogActualsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Visibility ────────────────────────────────────────────────────────────

  it("does not render when open is false", () => {
    renderModal({ open: false });
    expect(screen.queryByText("Log Monthly Actuals")).not.toBeInTheDocument();
  });

  it("renders form fields when open is true", () => {
    renderModal();
    expect(screen.getByText("Log Monthly Actuals")).toBeInTheDocument();
    // Use exact label text to avoid matching "Log Monthly Actuals" title
    expect(screen.getByLabelText("Month")).toBeInTheDocument();
    expect(screen.getByLabelText("Year")).toBeInTheDocument();
    expect(screen.getByLabelText("Actual Rent ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Actual Expenses ($)")).toBeInTheDocument();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("shows validation error for empty rent", async () => {
    renderModal();
    // Submit the form directly to bypass jsdom's native HTML5 constraint validation
    const form = document.querySelector("form");
    fireEvent.submit(form!);
    await waitFor(() => {
      expect(
        screen.getByText(/actual rent must be a non-negative number/i)
      ).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows validation error for negative expenses", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("Actual Rent ($)"), "1200");
    fireEvent.change(screen.getByLabelText("Actual Expenses ($)"), {
      target: { value: "-100" },
    });

    // Submit the form directly to bypass jsdom's native HTML5 constraint validation
    const form = document.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText(/actual expenses must be a non-negative number/i)
      ).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("calls onSuccess and closes modal on 201 response", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          actual: { id: "abc-123", month: 3, year: 2026 },
        }),
    });

    render(
      <LogActualsModal
        open={true}
        onOpenChange={onOpenChange}
        propertyId={DEFAULT_PROPS.propertyId}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByLabelText("Actual Rent ($)"), "1500");
    await user.type(screen.getByLabelText("Actual Expenses ($)"), "400");

    await user.click(screen.getByRole("button", { name: /log actuals/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ── Error paths ───────────────────────────────────────────────────────────

  it("shows 409 conflict error inline without a toast", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: "Conflict" }),
    });

    renderModal();

    await user.type(screen.getByLabelText("Actual Rent ($)"), "1200");
    await user.type(screen.getByLabelText("Actual Expenses ($)"), "300");
    await user.click(screen.getByRole("button", { name: /log actuals/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/actuals for this month and year already exist/i)
      ).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows generic error inline on 500 response without a toast", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    renderModal();

    await user.type(screen.getByLabelText("Actual Rent ($)"), "1200");
    await user.type(screen.getByLabelText("Actual Expenses ($)"), "300");
    await user.click(screen.getByRole("button", { name: /log actuals/i }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  // ── Form reset ────────────────────────────────────────────────────────────

  it("resets form fields when modal closes and reopens", async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal({ open: true });

    await user.type(screen.getByLabelText("Actual Rent ($)"), "9999");

    rerender(
      <LogActualsModal
        open={false}
        onOpenChange={DEFAULT_PROPS.onOpenChange}
        propertyId={DEFAULT_PROPS.propertyId}
        onSuccess={DEFAULT_PROPS.onSuccess}
      />
    );

    rerender(
      <LogActualsModal
        open={true}
        onOpenChange={DEFAULT_PROPS.onOpenChange}
        propertyId={DEFAULT_PROPS.propertyId}
        onSuccess={DEFAULT_PROPS.onSuccess}
      />
    );

    const yearInput = screen.getByLabelText("Year") as HTMLInputElement;
    expect(yearInput.value).toBe(String(new Date().getFullYear()));

    const rentInput = screen.getByLabelText("Actual Rent ($)") as HTMLInputElement;
    expect(rentInput.value).toBe("");
  });

  // ── Loading / disabled state ───────────────────────────────────────────────

  it("disables submit button while submitting", async () => {
    const user = userEvent.setup();
    let resolveRequest!: (v: Response | PromiseLike<Response>) => void;

    mockFetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      })
    );

    renderModal();

    await user.type(screen.getByLabelText("Actual Rent ($)"), "1200");
    await user.type(screen.getByLabelText("Actual Expenses ($)"), "300");

    await user.click(screen.getByRole("button", { name: /log actuals/i }));

    // The button should be disabled while the request is in-flight
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /saving/i });
      expect(btn).toBeDisabled();
    });

    // Clean up the hanging promise — wrap in act to flush pending state updates
    await act(async () => {
      resolveRequest({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "error" }),
      } as Response);
    });
  });
});
