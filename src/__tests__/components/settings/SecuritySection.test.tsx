import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSignInWithPassword, mockUpdateUser } = vi.hoisted(() => {
  return {
    mockSignInWithPassword: vi.fn(),
    mockUpdateUser: vi.fn(),
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      updateUser: mockUpdateUser,
    },
  }),
}));

import SecuritySection from "@/components/settings/SecuritySection";

describe("SecuritySection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows password form for email users", () => {
    render(<SecuritySection authProvider="email" email="test@example.com" />);
    expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
  });

  it("shows info message for Google users", () => {
    render(<SecuritySection authProvider="google" email="test@example.com" />);
    expect(screen.getByText(/signed in with Google/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Current Password/i)).not.toBeInTheDocument();
  });

  it("has password visibility toggles", () => {
    render(<SecuritySection authProvider="email" email="test@example.com" />);
    const toggles = screen.getAllByRole("button", { name: /show password|hide password/i });
    expect(toggles.length).toBe(3);
  });

  it("toggles password visibility on click", async () => {
    const user = userEvent.setup();
    render(<SecuritySection authProvider="email" email="test@example.com" />);
    const currentPwInput = screen.getByLabelText(/Current Password/i);
    expect(currentPwInput).toHaveAttribute("type", "password");

    const toggles = screen.getAllByRole("button", { name: /show password/i });
    await user.click(toggles[0]);
    expect(currentPwInput).toHaveAttribute("type", "text");
  });

  it("disables submit when fields are empty", () => {
    render(<SecuritySection authProvider="email" email="test@example.com" />);
    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    expect(submitBtn).toBeDisabled();
  });
});
