/**
 * Generates sample Excel files for testing the RentIQ import feature.
 * Run from the rpc/ directory:  node scripts/generate-test-sheets.mjs
 */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function write(filename, sheets) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const dest = path.join(OUT_DIR, filename);
  XLSX.writeFile(wb, dest);
  console.log(`✓  ${filename}`);
}

// ─── 1. Clean / simple column names ──────────────────────────────────────────
write("test-clean-columns.xlsx", [{
  name: "Sheet1",
  rows: [{
    "price":        350000,
    "down":         20,
    "rate":         7.0,
    "term":         30,
    "rent":         2400,
    "tax":          3600,
    "insurance":    120,
    "hoa":          0,
    "maintenance":  8,
    "vacancy":      8,
    "pm":           10,
    "closing":      3,
  }],
}]);

// ─── 2. BiggerPockets-style export ───────────────────────────────────────────
write("test-biggerpockets-style.xlsx", [{
  name: "Sheet1",
  rows: [{
    "Purchase Price":       350000,
    "Down Payment":         20,
    "Interest Rate":        7.0,
    "Loan Term":            30,
    "Monthly Gross Rent":   2400,
    "Annual Property Tax":  3600,
    "Insurance (Monthly)":  120,
    "HOA (Monthly)":        0,
    "CapEx Reserve":        8,
    "Vacancy Rate":         8,
    "Management Fee":       10,
    "Closing Costs":        3,
  }],
}]);

// ─── 3. Stessa-style export ───────────────────────────────────────────────────
write("test-stessa-style.xlsx", [{
  name: "Sheet1",
  rows: [{
    "Acquisition Price":    350000,
    "Equity":               20,
    "APR":                  7.0,
    "Amortization":         30,
    "Scheduled Rent":       2400,
    "Property Taxes":       3600,
    "Hazard Insurance":     120,
    "HOA Fee":              0,
    "CapEx":                8,
    "Vacancy Allowance":    8,
    "Property Management":  10,
    "Settlement Costs":     3,
  }],
}]);

// ─── 4. DealCheck-style export ────────────────────────────────────────────────
write("test-dealcheck-style.xlsx", [{
  name: "Sheet1",
  rows: [{
    "Asking Price":         350000,
    "Down %":               20,
    "Note Rate":            7.0,
    "Loan Period":          30,
    "Monthly Income":       2400,
    "Taxes":                3600,
    "Landlord Insurance":   120,
    "Condo Fee":            0,
    "Repairs":              8,
    "Loss to Vacancy":      8,
    "Mgmt Fee":             10,
    "Escrow":               3,
  }],
}]);

// ─── 5. DIY landlord spreadsheet (messy real-world column names) ──────────────
write("test-diy-landlord.xlsx", [{
  name: "Sheet1",
  rows: [{
    "Market Value":         "$350,000",   // currency-formatted string
    "DP":                   "20%",        // percent-formatted string
    "Int Rate":             "7.00%",      // percent with decimals
    "Years":                30,
    "GRI":                  "$2,400",
    "Annual Taxes":         "$3,600",
    "Ins":                  "$120",
    "Strata":               0,
    "Capital Expenditure":  8,
    "Void Rate":            8,
    "PM Rate":              10,
    "Acquisition Costs":    3,
  }],
}]);

// ─── 6. Worst case: extra irrelevant columns (should still map the right ones) ─
write("test-extra-columns.xlsx", [{
  name: "Sheet1",
  rows: [{
    "Property Address":     "123 Main St",   // unmapped — ignored
    "City":                 "Austin TX",     // unmapped — ignored
    "Bedrooms":             3,               // unmapped — ignored
    "Year Built":           2005,            // unmapped — ignored
    "Purchase Price":       350000,
    "Down Payment":         20,
    "Interest Rate":        7.0,
    "Term":                 30,
    "Rent":                 2400,
    "Property Tax":         3600,
    "Insurance":            120,
    "HOA":                  0,
    "Maintenance":          8,
    "Vacancy":              8,
    "Management Fee":       10,
    "Closing":              3,
    "MLS Number":           "MLS-12345",    // unmapped — ignored
    "Agent Name":           "Jane Smith",   // unmapped — ignored
  }],
}]);

console.log("\nDone! Import any of these files into RentIQ at /calculator");
