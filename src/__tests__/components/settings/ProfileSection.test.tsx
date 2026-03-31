// rpc/src/__tests__/components/settings/ProfileSection.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProfileSection from "@/components/settings/ProfileSection";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ProfileSection", () => {
  const defaultProps = {
    displayName: "Alex",
    email: "alex@gmail.com",
    createdAt: "2026-03-15T10:00:00Z",
    onDisplayNameUpdate: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it("renders display name, email, and member since", () => {
    render(<ProfileSection {...defaultProps} />);
    expect(screen.getByDisplayValue("Alex")).toBeInTheDocument();
    expect(screen.getByText("alex@gmail.com")).toBeInTheDocument();
    expect(screen.getByText(/Mar 2026/)).toBeInTheDocument();
  });

  it("disables Save button when name is unchanged", () => {
    render(<ProfileSection {...defaultProps} />);
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it("enables Save button when name is changed", async () => {
    const user = userEvent.setup();
    render(<ProfileSection {...defaultProps} />);
    const input = screen.getByDisplayValue("Alex");
    await user.clear(input);
    await user.type(input, "Alexander");
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it("calls onDisplayNameUpdate after successful save", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { display_name: "Alexander" } }),
    });

    render(<ProfileSection {...defaultProps} />);
    const input = screen.getByDisplayValue("Alex");
    await user.clear(input);
    await user.type(input, "Alexander");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(defaultProps.onDisplayNameUpdate).toHaveBeenCalledWith("Alexander");
    });
  });

  it("shows email as read-only (not an input)", () => {
    render(<ProfileSection {...defaultProps} />);
    const emailEl = screen.getByText("alex@gmail.com");
    expect(emailEl.tagName).not.toBe("INPUT");
  });
});
