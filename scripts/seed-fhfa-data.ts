#!/usr/bin/env npx tsx
/**
 * seed-fhfa-data.ts — FHFA ZIP3 House Price Index seeder
 *
 * Downloads the FHFA HPI ZIP3-level XLSX from:
 *   https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_at_3zip.xlsx
 *
 * Parses the quarterly index data, computes the 1-year % change per ZIP3
 * prefix (most recent quarter vs same quarter 1 year prior), and upserts
 * into the fhfa_zip3_hpi Supabase table.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   npx tsx scripts/seed-fhfa-data.ts
 *
 * Optional flags:
 *   --dry-run          Print the first 5 rows but do not write to Supabase
 *   --batch-size=N     Rows per upsert batch (default 200)
 *
 * ─── Environment ─────────────────────────────────────────────────────────────
 *
 * Reads from .env.local in the rpc/ directory:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * ─── Re-seeding ──────────────────────────────────────────────────────────────
 *
 *  Re-run annually (each October) after FHFA publishes new quarterly data.
 *  Existing rows are upserted (zip3 is the primary key), so re-running is safe.
 *
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as XLSX from "xlsx";

// ─── Load .env.local ──────────────────────────────────────────────────────────

config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌  Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in rpc/.env.local"
  );
  process.exit(1);
}

// ─── Parse CLI args ───────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!flag) return undefined;
  return flag.slice(flag.indexOf("=") + 1);
}

const isDryRun = process.argv.includes("--dry-run");
const batchSize = Math.min(parseInt(getArg("batch-size") ?? "200", 10), 500);
if (!Number.isFinite(batchSize) || batchSize <= 0) {
  console.error("❌  --batch-size must be a positive integer (max 500).");
  process.exit(1);
}

// ─── FHFA XLSX URL ────────────────────────────────────────────────────────────

const FHFA_URL =
  "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_at_3zip.xlsx";

const MAX_BODY_BYTES = 30 * 1024 * 1024; // 30 MB guard

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`📡  Downloading FHFA HPI ZIP3 data from:\n    ${FHFA_URL}\n`);

  const res = await fetch(FHFA_URL);
  if (!res.ok) {
    console.error(`❌  HTTP ${res.status} from FHFA. Try again later.`);
    process.exit(1);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) {
    console.error(`❌  File too large (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB).`);
    process.exit(1);
  }

  console.log(`✅  Downloaded ${(buf.byteLength / 1024 / 1024).toFixed(1)} MB`);

  // ── Parse XLSX ─────────────────────────────────────────────────────────────
  // File structure:
  //   Row 0: long disclaimer text
  //   Row 1: "Not Seasonally Adjusted (NSA)"
  //   Row 2: blank or separator
  //   Row 3: header — "Three-Digit ZIP Code", "Year", "Quarter", "Index (NSA)", "Index Type"
  //   Row 4+: data rows

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    defval: null,
    header: 1,
  });

  // Find the header row (contains "Year" and "Quarter")
  const headerIdx = raw.findIndex(
    (row) =>
      Array.isArray(row) &&
      row.some((c) => typeof c === "string" && c.toLowerCase().includes("year")) &&
      row.some((c) => typeof c === "string" && c.toLowerCase().includes("quarter"))
  );

  if (headerIdx < 0) {
    console.error("❌  Could not find header row. FHFA may have changed the file format.");
    process.exit(1);
  }

  const headers = (raw[headerIdx] as (string | null)[]).map((h) =>
    (h ?? "").toString().toLowerCase().trim()
  );

  const zip3Col  = headers.findIndex((h) => h.includes("zip") || h.includes("three"));
  const yearCol  = headers.findIndex((h) => h === "year");
  const qtrCol   = headers.findIndex((h) => h.includes("quarter"));
  const idxCol   = headers.findIndex((h) => h.includes("index") && !h.includes("type"));

  if ([zip3Col, yearCol, qtrCol, idxCol].includes(-1)) {
    console.error(`❌  Missing columns. Headers found: ${headers.join(", ")}`);
    process.exit(1);
  }

  console.log(`   Columns: zip3[${zip3Col}], year[${yearCol}], quarter[${qtrCol}], index[${idxCol}]`);

  // ── Build per-zip3 time series ─────────────────────────────────────────────
  // Map: zip3 → Map<"YYYYQn" → index_value>

  type TimeSeries = Map<string, number>;
  const seriesByZip3 = new Map<string, TimeSeries>();

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i] as (string | number | null)[];
    if (!row || row.length === 0) continue;

    const rawZip = row[zip3Col];
    if (rawZip === null || rawZip === undefined) continue;
    const zip3 = String(typeof rawZip === "number" ? Math.round(rawZip) : rawZip)
      .trim()
      .padStart(3, "0")
      .slice(0, 3);
    if (!/^\d{3}$/.test(zip3)) continue;

    const year = Number(row[yearCol]);
    const quarter = Number(row[qtrCol]);
    const indexVal = parseFloat(String(row[idxCol] ?? ""));

    if (!Number.isFinite(year) || !Number.isFinite(quarter) || isNaN(indexVal) || indexVal <= 0) continue;

    const period = `${year}Q${quarter}`;

    if (!seriesByZip3.has(zip3)) seriesByZip3.set(zip3, new Map());
    seriesByZip3.get(zip3)!.set(period, indexVal);
  }

  console.log(`   Time series built for ${seriesByZip3.size.toLocaleString()} ZIP3 prefixes`);

  // ── Compute 1-year % change per zip3 ──────────────────────────────────────

  type HpiRow = { zip3: string; hpi_1yr_pct_chg: number; period: string; seeded_at: string };
  const seededAt = new Date().toISOString();
  const rows: HpiRow[] = [];
  let skippedNoPrior = 0;

  for (const [zip3, series] of seriesByZip3) {
    // Sort periods lexicographically — works for "YYYYQn" format
    const periods = Array.from(series.keys()).sort();
    const latestPeriod = periods[periods.length - 1];
    const latestIndex = series.get(latestPeriod)!;

    // Parse most recent period to find same quarter 1 year ago
    const match = /^(\d{4})Q(\d)$/.exec(latestPeriod);
    if (!match) continue;

    const priorPeriod = `${Number(match[1]) - 1}Q${match[2]}`;
    const priorIndex = series.get(priorPeriod);

    if (!priorIndex) {
      skippedNoPrior++;
      continue;
    }

    const pct = ((latestIndex - priorIndex) / priorIndex) * 100;
    if (!Number.isFinite(pct)) continue;

    rows.push({
      zip3,
      hpi_1yr_pct_chg: Math.round(pct * 1000) / 1000,
      period: latestPeriod,
      seeded_at: seededAt,
    });
  }

  console.log(`\n✅  Rows with 1-year change: ${rows.length.toLocaleString()}`);
  if (skippedNoPrior > 0) {
    console.log(`⚠️   Skipped ${skippedNoPrior} ZIP3s (no prior-year data for comparison)`);
  }

  // ── Dry run ────────────────────────────────────────────────────────────────

  if (isDryRun) {
    console.log("\n🔍  DRY RUN — first 5 rows:");
    console.log(JSON.stringify(rows.slice(0, 5), null, 2));
    console.log("\n(No data written to Supabase)");
    return;
  }

  // ── Upsert in batches ──────────────────────────────────────────────────────

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  let inserted = 0;
  const totalBatches = Math.ceil(rows.length / batchSize);

  console.log(`\n🚀  Inserting ${rows.length} rows in ${totalBatches} batches of ${batchSize}...\n`);

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    const { error } = await supabase
      .from("fhfa_zip3_hpi")
      .upsert(batch, { onConflict: "zip3" });

    if (error) {
      console.error(`\n❌  Batch ${batchNum}/${totalBatches} failed:`, error.message);
    } else {
      inserted += batch.length;
      const pct = Math.round((batchNum / totalBatches) * 100);
      process.stdout.write(
        `\r   Progress: ${batchNum}/${totalBatches} batches (${pct}%) — ${inserted.toLocaleString()} rows`
      );
    }
  }

  console.log(`\n\n🎉  Seed complete! ${inserted.toLocaleString()} ZIP3 prefixes in fhfa_zip3_hpi.`);
  console.log(`   Re-run annually each October after FHFA publishes updated quarterly data.\n`);
}

main().catch((err: unknown) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
