import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FeedbackSection from "@/components/landing/FeedbackSection";

global.fetch = vi.fn();

describe("FeedbackSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the section heading", () => {
    render(<FeedbackSection />);
    expect(screen.getByRole("heading", { name: /share your feedback/i }))
      .toBeInTheDocument();
  });

  it("has section id 'feedback' for anchor linking", () => {
    const { container } = render(<FeedbackSection />);
    expect(container.querySelector("#feedback")).not.toBeNull();
  });

  it("renders name, email, message fields and submit button", () => {
    render(<FeedbackSection />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send feedback/i })).toBeInTheDocument();
  });

  it("shows validation error when submitting empty message", async () => {
    render(<FeedbackSection />);
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    expect(await screen.findByText(/message is required/i)).toBeInTheDocument();
  });

  it("shows success state after successful submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    render(<FeedbackSection />);
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Love the tool!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
  });

  it("shows error message on API failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    );
    render(<FeedbackSection />);
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Test feedback" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("disables button while submitting", async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      new Promise((resolve) => setTimeout(() =>
        resolve(new Response(JSON.stringify({ success: true }), { status: 200 })), 100))
    );
    render(<FeedbackSection />);
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    await waitFor(() => screen.findByText(/thank you/i));
  });
});
