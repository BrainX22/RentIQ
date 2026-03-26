import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";

// ─── Mock next/navigation (must be hoisted) ───────────────────────────────────

const mockRefresh = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: mockRefresh, push: mockPush })),
}));

// ─── Import component AFTER mocks ─────────────────────────────────────────────

import PaywallModal from "@/components/PaywallModal";

// ─── jsdom setup: replace window.location so href assignment is testable ──────
// jsdom's built-in Location object doesn't support href assignment in tests.

let capturedHref = "";

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      get href() { return capturedHref; },
      set href(val: string) { capturedHref = val; },
    },
  });
});

afterAll(() => {
  // Restore is not critical here since jsdom resets between test files
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderModal(open = true, onOpenChange = vi.fn()) {
  return { result: render(<PaywallModal open={open} onOpenChange={onOpenChange} />), onOpenChange };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PaywallModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedHref = "";
    vi.stubGlobal("fetch", vi.fn());
  });

  // ── Visibility ───────────────────────────────────────────────────────────────

  it("does not render modal content when open is false", () => {
    renderModal(false);
    expect(screen.queryByText(/all 5 free saves/i)).not.toBeInTheDocument();
  });

  it("renders the modal title when open is true", () => {
    renderModal(true);
    expect(screen.getByText(/all 5 free saves this month/i)).toBeInTheDocument();
  });

  it("renders the modal description", () => {
    renderModal(true);
    expect(screen.getByText(/unlimited property saves/i)).toBeInTheDocument();
  });

  // ── Buttons ───────────────────────────────────────────────────────────────────

  it("renders the Upgrade to Pro button", () => {
    renderModal(true);
    expect(screen.getByRole("button", { name: /upgrade to pro/i })).toBeInTheDocument();
  });

  it("renders the Maybe Later button", () => {
    renderModal(true);
    expect(screen.getByRole("button", { name: /maybe later/i })).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Maybe Later is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderModal(true);
    await user.click(screen.getByRole("button", { name: /maybe later/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── Max feature upsell ───────────────────────────────────────────────────────

  it("renders Max upsell title when reason=max_feature", () => {
    render(
      <PaywallModal
        open={true}
        onOpenChange={vi.fn()}
        reason="max_feature"
        featureName="Portfolio Tracking"
      />
    );
    expect(screen.getByText(/portfolio tracking requires max/i)).toBeInTheDocument();
  });

  it("renders Upgrade to Max button when reason=max_feature", () => {
    render(
      <PaywallModal
        open={true}
        onOpenChange={vi.fn()}
        reason="max_feature"
      />
    );
    expect(screen.getByRole("button", { name: /upgrade to max/i })).toBeInTheDocument();
  });

  it("sends tier=max to checkout when reason=max_feature", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://checkout.stripe.com/pay/cs_max" }),
    } as Response);

    render(
      <PaywallModal open={true} onOpenChange={vi.fn()} reason="max_feature" />
    );
    await user.click(screen.getByRole("button", { name: /upgrade to max/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/checkout",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tier: "max" }),
        })
      );
    });
  });

  // ── Checkout flow ─────────────────────────────────────────────────────────────

  it("calls POST /api/checkout with tier=pro when Upgrade is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://checkout.stripe.com/pay/cs_test_abc" }),
    } as Response);

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/checkout",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tier: "pro" }),
        })
      );
    });
  });

  it("redirects to the Stripe checkout URL on success", async () => {
    const user = userEvent.setup();
    const checkoutUrl = "https://checkout.stripe.com/pay/cs_test_abc";
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: checkoutUrl }),
    } as Response);

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(capturedHref).toBe(checkoutUrl);
    });
  });

  // ── Error states ──────────────────────────────────────────────────────────────

  it("shows the API error message when checkout fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Payment service unavailable" }),
    } as Response);

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(screen.getByText("Payment service unavailable")).toBeInTheDocument();
    });
  });

  it("shows fallback error message when API returns no error string", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it("shows network error message when fetch throws", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Failed to connect"));

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  // ── 409 already-subscribed path ───────────────────────────────────────────────

  it("closes modal and refreshes on 409 (already subscribed)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({}),
    } as Response);

    render(<PaywallModal open={true} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("does NOT redirect on 409", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({}),
    } as Response);

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
    expect(capturedHref).toBe("");
  });

  // ── Loading state ─────────────────────────────────────────────────────────────

  it("shows Redirecting... and disables button while loading", async () => {
    const user = userEvent.setup();
    let resolve!: (v: Response | PromiseLike<Response>) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise<Response>((r) => { resolve = r; })
    );

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    // Button should be in loading state immediately after click
    const btn = screen.getByRole("button", { name: /redirecting/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();

    // Clean up the hanging promise
    resolve({ ok: false, status: 500, json: async () => ({}) } as Response);
  });

  it("re-enables the button and clears loading state after request completes", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Some error" }),
    } as Response);

    renderModal(true);
    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(screen.getByText("Some error")).toBeInTheDocument();
    });

    // After the request completes, the original button text should be back
    expect(screen.getByRole("button", { name: /upgrade to pro/i })).not.toBeDisabled();
  });
});
