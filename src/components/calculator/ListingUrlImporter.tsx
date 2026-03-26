"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CalculatorInputs } from "@/types";
import { FileUp, Loader2, Sparkles, Upload, X } from "lucide-react";
import {
  parseXlsxBuffer,
  autoMapXlsxHeaders,
  buildInputsFromXlsxRow,
  type XlsxMapping,
} from "@/lib/xlsx-parser";

// ─── Field labels ─────────────────────────────────────────────────────────────

const FIELD_LABELS: Array<{ key: keyof CalculatorInputs; label: string }> = [
  { key: "propertyPrice", label: "Property Price" },
  { key: "downPaymentPercent", label: "Down Payment %" },
  { key: "interestRate", label: "Interest Rate %" },
  { key: "loanTermYears", label: "Loan Term (Years)" },
  { key: "monthlyRent", label: "Monthly Rent" },
  { key: "propertyTaxYearly", label: "Property Tax (Yearly)" },
  { key: "insuranceMonthly", label: "Insurance (Monthly)" },
  { key: "hoaFeesMonthly", label: "HOA Fees (Monthly)" },
  { key: "maintenancePercent", label: "Maintenance %" },
  { key: "vacancyPercent", label: "Vacancy %" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onApply: (values: Partial<CalculatorInputs>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListingUrlImporter({ onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [mapping, setMapping] = useState<XlsxMapping>({});
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setFileName(null);
    setHeaders([]);
    setRow(null);
    setMapping({});
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    // Reject before allocating memory — 5 MB is ample for any property spreadsheet
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error("File is too large. Maximum size is 5 MB.");
      return;
    }

    setIsLoading(true);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const { headers: h, firstRow } = parseXlsxBuffer(buffer);

        if (h.length === 0) {
          toast.error("Spreadsheet appears empty or has no headers.");
          return;
        }
        if (Object.keys(firstRow).length === 0) {
          toast.error("Add at least one data row below your headers.");
          return;
        }

        setFileName(file.name);
        setHeaders(h);
        setRow(firstRow);
        setMapping(autoMapXlsxHeaders(h));
        toast.success(`"${file.name}" loaded. Review the column mapping below.`);
      } else {
        // CSV fallback via papaparse — promisified so the finally block runs after parsing
        await new Promise<void>((resolve) => {
          Papa.parse<Record<string, unknown>>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(),
            complete: ({ data, errors, meta }) => {
              if (errors.length > 0) {
                toast.error("CSV could not be parsed. Check the file format.");
              } else {
                const h = meta.fields ?? [];
                if (h.length === 0 || data.length === 0) {
                  toast.error("CSV appears empty. Add headers and at least one row.");
                } else {
                  setFileName(file.name);
                  setHeaders(h);
                  setRow(data[0]);
                  setMapping(autoMapXlsxHeaders(h));
                  toast.success(`"${file.name}" loaded. Review the column mapping below.`);
                }
              }
              resolve();
            },
            error: () => {
              toast.error("CSV import failed. Try a different file.");
              resolve();
            },
          });
        });
      }
    } catch {
      toast.error("Could not read file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!row) {
      toast.error("Upload a file first.");
      return;
    }

    const mapped = buildInputsFromXlsxRow(row, mapping);
    const count = Object.keys(mapped).length;

    if (count === 0) {
      toast.message("No fields mapped. Adjust the column mapping above and try again.");
      return;
    }

    onApply(mapped);
    toast.success(`Applied ${count} field${count === 1 ? "" : "s"} from spreadsheet.`);
    reset();
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-orange-500" />
        <p className="text-sm font-semibold text-gray-700">Import from Spreadsheet</p>
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          .xlsx · .xls · .csv
        </span>
      </div>

      {!fileName ? (
        /* ── Upload area ── */
        <div>
          <input
            ref={inputRef}
            id="spreadsheet-upload"
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="sr-only"
            disabled={isLoading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <label
            htmlFor="spreadsheet-upload"
            className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-orange-300 hover:bg-orange-50"
          >
            {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
            ) : (
              <FileUp className="h-7 w-7 text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-600">
              {isLoading ? "Reading file…" : "Click to upload spreadsheet"}
            </span>
            <span className="text-xs text-gray-400">Excel (.xlsx, .xls) or CSV</span>
          </label>
          <p className="mt-2 text-xs text-gray-400">
            Tip: include columns named property_price, monthly_rent, interest_rate for best auto-mapping.
          </p>
        </div>
      ) : (
        /* ── Column mapping UI ── */
        <div className="space-y-4">
          {/* File badge */}
          <div className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="text-sm font-medium text-orange-700 truncate max-w-xs">{fileName}</span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded p-1 text-orange-400 hover:bg-orange-100 hover:text-orange-600"
              aria-label="Remove file and start over"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Column mapping grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELD_LABELS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`map-${key}`} className="text-xs text-gray-500">
                  {label}
                </Label>
                <select
                  id={`map-${key}`}
                  value={mapping[key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [key]: e.target.value || undefined,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                >
                  <option value="">Not mapped</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Apply button */}
          <Button
            type="button"
            onClick={handleApply}
            className="w-full bg-orange-500 text-white hover:bg-orange-600"
          >
            <Upload className="mr-2 h-4 w-4" />
            Apply to Calculator
          </Button>

          <p className="text-xs text-gray-400">
            First data row will be used. Unmapped fields are left unchanged.
          </p>
        </div>
      )}
    </div>
  );
}
