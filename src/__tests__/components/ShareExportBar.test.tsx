import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ShareExportBar from "@/components/calculator/ShareExportBar";
import { DEFAULT_CALCULATOR_INPUTS } from "@/hooks/useCalculator";

// Mock sonner toast — use vi.hoisted so the variable is available when vi.mock factory runs
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

describe("ShareExportBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Share Link and Print Report buttons", () => {
    render(<ShareExportBar inputs={DEFAULT_CALCULATOR_INPUTS} />);
    expect(screen.getByRole("button", { name: /share link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print report/i })).toBeInTheDocument();
  });

  it("copies share URL to clipboard and shows success toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareExportBar inputs={DEFAULT_CALCULATOR_INPUTS} />);
    fireEvent.click(screen.getByRole("button", { name: /share link/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
      const url = writeText.mock.calls[0][0] as string;
      expect(url).toContain("/calculator?data=");
    });

    expect(mockToast.success).toHaveBeenCalledWith("Link copied to clipboard");
  });

  it("shows error toast when clipboard fails", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    render(<ShareExportBar inputs={DEFAULT_CALCULATOR_INPUTS} />);
    fireEvent.click(screen.getByRole("button", { name: /share link/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Could not copy link — try HTTPS.");
    });
  });

  it("calls window.print() when Print Report is clicked", () => {
    window.print = vi.fn();
    render(<ShareExportBar inputs={DEFAULT_CALCULATOR_INPUTS} />);
    fireEvent.click(screen.getByRole("button", { name: /print report/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("has no-print class so buttons are hidden when printing", () => {
    const { container } = render(<ShareExportBar inputs={DEFAULT_CALCULATOR_INPUTS} />);
    expect(container.firstElementChild?.className).toContain("no-print");
  });
});
