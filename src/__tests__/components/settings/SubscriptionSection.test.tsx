import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SubscriptionSection from "@/components/settings/SubscriptionSection";

vi.stubGlobal("fetch", vi.fn());

describe("SubscriptionSection", () => {
  it("renders Free plan with usage counter", () => {
    render(
      <SubscriptionSection
        planType="free"
        status="active"
        currentPeriodEnd={null}
        cancelAtPeriodEnd={false}
        cancelAt={null}
        savesThisMonth={3}
        totalProperties={2}
      />
    );
    expect(screen.getByText(/Free/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 5/)).toBeInTheDocument();
    expect(screen.getByText(/2 total properties/)).toBeInTheDocument();
  });

  it("renders Pro plan with renewal date", () => {
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    render(
      <SubscriptionSection
        planType="pro"
        status="active"
        currentPeriodEnd={futureDate}
        cancelAtPeriodEnd={false}
        cancelAt={null}
        savesThisMonth={12}
        totalProperties={8}
      />
    );
    expect(screen.getByText(/Pro —/)).toBeInTheDocument();
    expect(screen.getByText(/Renews/)).toBeInTheDocument();
    expect(screen.getByText(/Manage Subscription/)).toBeInTheDocument();
  });

  it("shows cancellation info when cancel_at_period_end is true", () => {
    const futureDate = new Date(Date.now() + 5 * 86400000).toISOString();
    render(
      <SubscriptionSection
        planType="max"
        status="active"
        currentPeriodEnd={futureDate}
        cancelAtPeriodEnd={true}
        cancelAt={futureDate}
        savesThisMonth={0}
        totalProperties={0}
      />
    );
    expect(screen.getByText(/Cancels/)).toBeInTheDocument();
  });

  it("shows upgrade prompt for free tier", () => {
    render(
      <SubscriptionSection
        planType="free"
        status="active"
        currentPeriodEnd={null}
        cancelAtPeriodEnd={false}
        cancelAt={null}
        savesThisMonth={0}
        totalProperties={0}
      />
    );
    expect(screen.getByText(/Upgrade/i)).toBeInTheDocument();
  });
});
