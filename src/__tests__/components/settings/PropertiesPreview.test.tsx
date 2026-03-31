import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PropertiesPreview from "@/components/settings/PropertiesPreview";

describe("PropertiesPreview", () => {
  const properties = [
    { id: "1", property_name: "123 Oak St", monthly_cash_flow: 340, created_at: "2026-03-27T00:00:00Z" },
    { id: "2", property_name: "456 Elm Ave", monthly_cash_flow: -50, created_at: "2026-03-25T00:00:00Z" },
  ];

  it("renders property names", () => {
    render(<PropertiesPreview properties={properties} totalCount={2} />);
    expect(screen.getByText("123 Oak St")).toBeInTheDocument();
    expect(screen.getByText("456 Elm Ave")).toBeInTheDocument();
  });

  it("shows positive cash flow in emerald", () => {
    render(<PropertiesPreview properties={properties} totalCount={2} />);
    const positive = screen.getByText("+$340");
    expect(positive.className).toContain("emerald");
  });

  it("shows negative cash flow in red", () => {
    render(<PropertiesPreview properties={properties} totalCount={2} />);
    const negative = screen.getByText("-$50");
    expect(negative.className).toContain("red");
  });

  it("shows 'View all' link with total count", () => {
    render(<PropertiesPreview properties={properties} totalCount={8} />);
    expect(screen.getByText(/View all 8 properties/)).toBeInTheDocument();
  });

  it("shows empty state when no properties", () => {
    render(<PropertiesPreview properties={[]} totalCount={0} />);
    expect(screen.getByText(/No properties saved yet/)).toBeInTheDocument();
  });
});
