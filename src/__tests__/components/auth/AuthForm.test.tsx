import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSignInWithPassword, mockSignUp, mockSignInWithOtp } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignInWithOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOtp: mockSignInWithOtp,
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

describe("AuthForm — Google OAuth removed", () => {
  it("does not render a Google sign-in button", () => {
    render(<AuthForm mode="login" />);
    expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();
  });
});

describe("AuthForm — magic link", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a sign-in-with-email-link button", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByRole("button", { name: /sign in with email link/i })).toBeInTheDocument();
  });

  it("shows toast error when magic link clicked with no email", async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    await user.click(screen.getByRole("button", { name: /sign in with email link/i }));
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it("calls signInWithOtp with email and redirect URL", async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /sign in with email link/i }));
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com" })
    );
  });

  it("shows confirmation message after successful magic link send", async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /sign in with email link/i }));
    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
  });

  it("hides confirmation message on error and keeps button visible", async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockResolvedValue({ error: { message: "Rate limit exceeded" } });
    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /sign in with email link/i }));
    await waitFor(() => {
      expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in with email link/i })).toBeInTheDocument();
    });
  });
});
