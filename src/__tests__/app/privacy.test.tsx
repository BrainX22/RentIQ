import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";

describe("Privacy Policy page", () => {
  it("renders the main heading", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: /privacy policy/i, level: 1 }))
      .toBeInTheDocument();
  });

  it("mentions Supabase as data processor", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/supabase/i).length).toBeGreaterThanOrEqual(1);
  });

  it("mentions LemonSqueezy as payment processor", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/lemonsqueezy/i).length).toBeGreaterThanOrEqual(1);
  });

  it("mentions Resend for email", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/resend/i).length).toBeGreaterThanOrEqual(1);
  });

  it("mentions Plausible for analytics", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/plausible/i).length).toBeGreaterThanOrEqual(1);
  });

  it("explains how to delete account", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/delete.*account/i).length).toBeGreaterThanOrEqual(1);
  });
});
