import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChangelogPage from "@/app/changelog/page";

describe("Changelog page", () => {
  it("renders the heading", () => {
    render(<ChangelogPage />);
    expect(screen.getByRole("heading", { name: /changelog/i, level: 1 }))
      .toBeInTheDocument();
  });

  it("shows the v1.0 launch entry", () => {
    render(<ChangelogPage />);
    expect(screen.getByText(/v1\.0/i)).toBeInTheDocument();
  });

  it("shows April 2026 as the launch date", () => {
    render(<ChangelogPage />);
    expect(screen.getByText(/april 2026/i)).toBeInTheDocument();
  });

  it("lists at least 3 launch features", () => {
    render(<ChangelogPage />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(3);
  });
});
