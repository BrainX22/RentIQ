import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SettingsHeader from "@/components/settings/SettingsHeader";

describe("SettingsHeader", () => {
  it("renders welcome greeting with display name", () => {
    render(<SettingsHeader displayName="Alex" planType="free" currentPeriodEnd={null} />);
    expect(screen.getByText("Welcome, Alex")).toBeInTheDocument();
  });

  it("renders Free tier badge", () => {
    render(<SettingsHeader displayName="Alex" planType="free" currentPeriodEnd={null} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("renders Pro badge with days remaining", () => {
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    render(<SettingsHeader displayName="Alex" planType="pro" currentPeriodEnd={futureDate} />);
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText(/\d+ days/)).toBeInTheDocument();
  });

  it("renders Max badge with days remaining", () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    render(<SettingsHeader displayName="Alex" planType="max" currentPeriodEnd={futureDate} />);
    expect(screen.getByText("Max")).toBeInTheDocument();
    expect(screen.getByText(/\d+ days/)).toBeInTheDocument();
  });

  it("shows 0 days when period end is in the past", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    render(<SettingsHeader displayName="Alex" planType="pro" currentPeriodEnd={pastDate} />);
    expect(screen.getByText(/0 days/)).toBeInTheDocument();
  });
});
