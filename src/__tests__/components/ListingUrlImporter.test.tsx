/**
 * Component tests for ListingUrlImporter.
 * Covers: file size guard, Excel parse flow, CSV parse flow,
 * column mapping UI, apply/reset, and error states.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ListingUrlImporter from "@/components/calculator/ListingUrlImporter";
import * as xlsxParser from "@/lib/xlsx-parser";
import * as sonner from "sonner";

// ─── Mock xlsx-parser (unit boundary) ─────────────────────────────────────────

vi.mock("@/lib/xlsx-parser", () => ({
  parseXlsxBuffer: vi.fn(),
  autoMapXlsxHeaders: vi.fn(),
  buildInputsFromXlsxRow: vi.fn(),
}));

// ─── Mock papaparse ───────────────────────────────────────────────────────────

vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn(
      (
        _file: unknown,
        opts: {
          complete: (r: {
            data: unknown[];
            errors: unknown[];
            meta: { fields: string[] };
          }) => void;
          error: () => void;
        }
      ) => {
        opts.complete({
          data: [{ property_price: 200000, monthly_rent: 1500 }],
          errors: [],
          meta: { fields: ["property_price", "monthly_rent"] },
        });
      }
    ),
  },
}));

// ─── Mock sonner toasts ───────────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFile(
  name: string,
  sizeBytes = 1024,
  type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
) {
  const content = new Uint8Array(sizeBytes).fill(0);
  return new File([content], name, { type });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ListingUrlImporter", () => {
  let onApply: ReturnType<typeof vi.fn>;

  const mockParseXlsx = vi.mocked(xlsxParser.parseXlsxBuffer);
  const mockAutoMap = vi.mocked(xlsxParser.autoMapXlsxHeaders);
  const mockBuildInputs = vi.mocked(xlsxParser.buildInputsFromXlsxRow);
  const mockToast = vi.mocked(sonner.toast);

  beforeEach(() => {
    onApply = vi.fn();
    vi.clearAllMocks();

    // Default: successful xlsx parse
    mockParseXlsx.mockReturnValue({ headers: ["price", "rent"], firstRow: { price: 300000, rent: 2000 } });
    mockAutoMap.mockReturnValue({ propertyPrice: "price", monthlyRent: "rent" });
    mockBuildInputs.mockReturnValue({ propertyPrice: 300000, monthlyRent: 2000 });
  });

  it("renders upload area with correct accept text", () => {
    render(<ListingUrlImporter onApply={onApply} />);
    expect(screen.getByText(/upload spreadsheet/i)).toBeInTheDocument();
    expect(screen.getByText(/Excel \(.xlsx, .xls\) or CSV/i)).toBeInTheDocument();
  });

  it("rejects files larger than 5 MB before allocating memory", async () => {
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const bigFile = makeFile("big.xlsx", 6 * 1024 * 1024);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, bigFile);

    expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/too large/i));
    expect(mockParseXlsx).not.toHaveBeenCalled();
    expect(screen.queryByText(/Apply to Calculator/i)).not.toBeInTheDocument();
  });

  it("parses an xlsx file and shows the mapping UI with the file badge", async () => {
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const file = makeFile("deals.xlsx");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/Apply to Calculator/i)).toBeInTheDocument();
    });
    expect(screen.getByText("deals.xlsx")).toBeInTheDocument();
    expect(mockParseXlsx).toHaveBeenCalledTimes(1);
  });

  it("parses a csv file and shows the mapping UI", async () => {
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const csvFile = makeFile("sheet.csv", 512, "text/csv");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, csvFile);

    await waitFor(() => {
      expect(screen.getByText(/Apply to Calculator/i)).toBeInTheDocument();
    });
    // CSV does not go through parseXlsxBuffer
    expect(mockParseXlsx).not.toHaveBeenCalled();
  });

  it("calls onApply with mapped values when Apply is clicked", async () => {
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const file = makeFile("deals.xlsx");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => screen.getByText(/Apply to Calculator/i));
    await user.click(screen.getByText(/Apply to Calculator/i));

    expect(onApply).toHaveBeenCalledWith({ propertyPrice: 300000, monthlyRent: 2000 });
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/applied 2 fields/i));
  });

  it("shows toast and does not call onApply when no fields map", async () => {
    mockBuildInputs.mockReturnValueOnce({});
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const file = makeFile("deals.xlsx");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => screen.getByText(/Apply to Calculator/i));
    await user.click(screen.getByText(/Apply to Calculator/i));

    expect(mockToast.message).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("shows error toast and stays on upload area when xlsx has no headers", async () => {
    mockParseXlsx.mockReturnValueOnce({ headers: [], firstRow: {} });
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const file = makeFile("empty.xlsx");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/empty|no headers/i));
    });
    expect(screen.queryByText(/Apply to Calculator/i)).not.toBeInTheDocument();
  });

  it("shows error toast when xlsx has headers but no data rows", async () => {
    mockParseXlsx.mockReturnValueOnce({ headers: ["price", "rent"], firstRow: {} });
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const file = makeFile("headers-only.xlsx");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/at least one/i));
    });
    expect(screen.queryByText(/Apply to Calculator/i)).not.toBeInTheDocument();
  });

  it("resets to upload area when the remove-file button is clicked", async () => {
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const file = makeFile("deals.xlsx");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => screen.getByRole("button", { name: /remove file/i }));
    await user.click(screen.getByRole("button", { name: /remove file/i }));

    expect(screen.getByText(/upload spreadsheet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Apply to Calculator/i)).not.toBeInTheDocument();
  });

  it("resets back to upload area after a successful apply", async () => {
    const user = userEvent.setup();
    render(<ListingUrlImporter onApply={onApply} />);

    const file = makeFile("deals.xlsx");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => screen.getByText(/Apply to Calculator/i));
    await user.click(screen.getByText(/Apply to Calculator/i));

    // After apply, returns to upload state
    await waitFor(() => {
      expect(screen.getByText(/upload spreadsheet/i)).toBeInTheDocument();
    });
  });
});
