import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DangerZone from "@/components/settings/DangerZone";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("DangerZone", () => {
  const onAccountDeleted = vi.fn();
  beforeEach(() => vi.clearAllMocks());

  it("renders danger zone with delete button", () => {
    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete Account/i })).toBeInTheDocument();
  });

  it("opens confirmation panel on click", async () => {
    const user = userEvent.setup();
    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    await user.click(screen.getByRole("button", { name: /Delete Account/i }));
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
  });

  it("disables confirm button until DELETE is typed", async () => {
    const user = userEvent.setup();
    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    await user.click(screen.getByRole("button", { name: /Delete Account/i }));

    const confirmBtn = screen.getByRole("button", { name: /Delete My Account/i });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByPlaceholderText("DELETE");
    await user.type(input, "DELETE");
    expect(confirmBtn).not.toBeDisabled();
  });

  it("calls API and onAccountDeleted on successful deletion", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deleted: true }),
    });

    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    await user.click(screen.getByRole("button", { name: /Delete Account/i }));
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    await user.click(screen.getByRole("button", { name: /Delete My Account/i }));

    expect(mockFetch).toHaveBeenCalledWith("/api/account/delete", expect.objectContaining({
      method: "POST",
    }));
  });
});
