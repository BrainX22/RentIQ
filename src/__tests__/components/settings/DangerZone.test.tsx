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

  it("shows password field in confirmation panel", async () => {
    const user = userEvent.setup();
    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    await user.click(screen.getByRole("button", { name: /Delete Account/i }));
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
  });

  it("disables confirm button until DELETE is typed AND password entered", async () => {
    const user = userEvent.setup();
    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    await user.click(screen.getByRole("button", { name: /Delete Account/i }));

    const confirmBtn = screen.getByRole("button", { name: /Delete My Account/i });
    expect(confirmBtn).toBeDisabled();

    // Type DELETE but no password — still disabled
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    expect(confirmBtn).toBeDisabled();

    // Enter password — now enabled
    await user.type(screen.getByLabelText(/current password/i), "mypassword");
    expect(confirmBtn).not.toBeDisabled();
  });

  it("calls API with confirmation and currentPassword", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deleted: true }),
    });

    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    await user.click(screen.getByRole("button", { name: /Delete Account/i }));
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    await user.type(screen.getByLabelText(/current password/i), "mypassword");
    await user.click(screen.getByRole("button", { name: /Delete My Account/i }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/account/delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE", currentPassword: "mypassword" }),
      })
    );
  });

  it("shows error toast on incorrect password (401)", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Incorrect password." }),
    });

    render(<DangerZone onAccountDeleted={onAccountDeleted} />);
    await user.click(screen.getByRole("button", { name: /Delete Account/i }));
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    await user.type(screen.getByLabelText(/current password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /Delete My Account/i }));

    expect(onAccountDeleted).not.toHaveBeenCalled();
  });
});
