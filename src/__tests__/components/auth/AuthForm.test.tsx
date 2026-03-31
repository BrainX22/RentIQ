import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSignInWithPassword, mockSignUp, mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AuthForm from "@/components/auth/AuthForm";

describe("AuthForm — password visibility toggle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("password input is hidden by default", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("shows a toggle button for the password field", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
  });

  it("clicking toggle reveals the password", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });

  it("clicking toggle again hides the password", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);
    await user.click(screen.getByRole("button", { name: /show password/i }));
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("aria-label updates to 'Hide password' when revealed", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });

  it("works the same way on the signup form", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });
});
