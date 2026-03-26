#!/usr/bin/env npx tsx
/**
 * seed-fmr-data.ts — Annual HUD Fair Market Rent seeder
 *
 * Reads a HUD Small Area FMR (SAFMR) spreadsheet and bulk-upserts rent
 * benchmarks into the rental_comps_cache Supabase table.
 *
 * ─── How to get the data file ────────────────────────────────────────────────
 *
 *  1. Visit: https://www.huduser.gov/portal/datasets/fmr.html
 *  2. Click the latest year tab (e.g. "2026")
 *  3. Under the "Data" tab, download: "Small Area FMRs (*.xlsx)"
 *     — it is a free public download, no account needed (~4MB file).
 *  4. Save the file anywhere (e.g. ~/Downloads/fy2026_safmrs.xlsx).
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   npx tsx scripts/seed-fmr-data.ts --file=/path/to/fy2026_safmrs.xlsx
 *
 * Optional flags:
 *   --dry-run          Print the first 5 rows but do not write to Supabase
 *   --batch-size=N     Rows per upsert batch (default 500)
 *
 * ─── Environment ─────────────────────────────────────────────────────────────
 *
 * Reads from .env.local in the rpc/ directory:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (needed for bypassing RLS on shared cache)
 *
 * ─── Column name changes by year ─────────────────────────────────────────────
 *
 *  HUD changes column names between fiscal years. This script handles all
 *  known variants automatically via alias matching + whitespace normalisation:
 *
 *  FY2024 and earlier:
 *    zcta, fmr_0, fmr_1, fmr_2, fmr_3, fmr_4
 *
 *  FY2026 (confirmed working):
 *    "ZIP\nCode", "SAFMR\n0BR", "SAFMR\n1BR", "SAFMR\n2BR", "SAFMR\n3BR", "SAFMR\n4BR"
 *    (newlines in header names are collapsed to spaces before matching)
 *
 *  If a future year introduces new column names, add aliases to ZIP_ALIASES
 *  and FMR_ALIASES below.
 *
 * ─── Deduplication ───────────────────────────────────────────────────────────
 *
 *  The HUD SAFMR file contains duplicate ZIP+bedroom entries (same ZIP listed
 *  multiple times for different metro areas). This script deduplicates by
 *  zip_code+bedrooms before batching to prevent Postgres upsert conflicts.
 *
 * ─── Cache TTL ────────────────────────────────────────────────────────────────
 *
 *  Seeded rows expire after 1 year (HUD FMRs update annually in October).
 *  Re-run this script each October with the new fiscal year's file.
 *
 * ─── Seed history ────────────────────────────────────────────────────────────
 *
 *  2026-03-20  FY2026 SAFMR seeded — 193,005 rows, 387 batches, 0 errors.
 *              Expires 2027-03-20. Re-seed October 2026 with FY2027 file.
 *
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
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

const filePath = getArg("file");
const isDryRun = process.argv.includes("--dry-run");
const batchSize = parseInt(getArg("batch-size") ?? "500", 10);
if (!Number.isFinite(batchSize) || batchSize <= 0) {
  console.error("❌  --batch-size must be a positive integer (default: 500).");
  process.exit(1);
}

if (!filePath) {
  console.error("❌  Usage: npx tsx scripts/seed-fmr-data.ts --file=/path/to/fy2024_safmrs.xlsx");
  process.exit(1);
}

// ─── Column name aliases ──────────────────────────────────────────────────────
// Normalised to lowercase. HUD may use 'zcta', 'zip_code', 'zip', etc.

const ZIP_ALIASES  = ["zcta", "zip_code", "zip", "zipcode", "zip code"];
const FMR_ALIASES: Record<number, string[]> = {
  0: ["fmr_0", "fmr0", "efficiency", "eff", "studio", "safmr 0br", "safmr0br"],
  1: ["fmr_1", "fmr1", "one_br", "1br", "1-br", "safmr 1br", "safmr1br"],
  2: ["fmr_2", "fmr2", "two_br", "2br", "2-br", "safmr 2br", "safmr2br"],
  3: ["fmr_3", "fmr3", "three_br", "3br", "3-br", "safmr 3br", "safmr3br"],
  4: ["fmr_4", "fmr4", "four_br", "4br", "4-br", "safmr 4br", "safmr4br"],
};

function resolveCol(
  headers: string[],
  aliases: string[]
): string | undefined {
  // Normalise: lowercase + collapse all whitespace/newlines to single space
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());
  const idx = aliases.map((a) => lower.indexOf(a)).find((i) => i !== -1);
  return idx !== undefined ? headers[idx] : undefined;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`📂  Reading: ${filePath}`);
  const buffer = readFileSync(resolve(filePath!));
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.error("❌  Workbook has no sheets.");
    process.exit(1);
  }

  console.log(`📊  Sheet: "${sheetName}"`);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  if (rows.length === 0) {
    console.error("❌  Sheet is empty.");
    process.exit(1);
  }

  const headers = Object.keys(rows[0]);
  console.log(`   Columns detected: ${headers.join(", ")}`);

  // Resolve ZIP column
  const zipCol = resolveCol(headers, ZIP_ALIASES);
  if (!zipCol) {
    console.error(
      `❌  Could not find a ZIP code column. Expected one of: ${ZIP_ALIASES.join(", ")}`
    );
    console.error(`   Detected columns: ${headers.join(", ")}`);
    process.exit(1);
  }

  // Resolve FMR columns (0–4 bedrooms)
  const fmrCols: Partial<Record<number, string>> = {};
  for (const [beds, aliases] of Object.entries(FMR_ALIASES)) {
    const col = resolveCol(headers, aliases);
    if (col) fmrCols[Number(beds)] = col;
  }

  const foundBeds = Object.keys(fmrCols).map(Number).sort();
  if (foundBeds.length === 0) {
    console.error("❌  Could not find any FMR rent columns (fmr_0 … fmr_4).");
    process.exit(1);
  }

  console.log(`   FMR columns found for bedrooms: ${foundBeds.join(", ")}`);
  console.log(`   Total rows: ${rows.length.toLocaleString()}`);

  // ── Build cache rows ───────────────────────────────────────────────────────

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1-year TTL

  type CacheRow = {
    zip_code: string;
    bedrooms: number;
    comps_json: object;
    fetched_at: string;
    expires_at: string;
  };

  const cacheRows: CacheRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    // Excel often stores ZIPs as numbers (e.g. 1234 for 01234).
    // Parse numeric cells with Math.round to avoid float artifacts like "12340" from "1234.0".
    const rawVal = row[zipCol];
    const rawZip =
      typeof rawVal === "number"
        ? String(Math.round(rawVal))
        : String(rawVal ?? "").trim().replace(/\D/g, "");
    // Ensure 5-digit ZIP (pad with leading zero if needed, e.g. 01234)
    const zip = rawZip.padStart(5, "0").slice(0, 5);
    if (zip.length !== 5) {
      skipped++;
      continue;
    }

    for (const beds of foundBeds) {
      const fmrCol = fmrCols[beds]!;
      const rawRent = row[fmrCol];
      const rent = typeof rawRent === "number" ? rawRent : parseFloat(String(rawRent ?? ""));
      if (isNaN(rent) || rent <= 0) continue;

      const roundedRent = Math.round(rent * 100) / 100;

      cacheRows.push({
        zip_code: zip,
        bedrooms: beds,
        comps_json: {
          source: "hud_fmr",
          marketMedian: roundedRent,
          comps: [
            {
              beds,
              rent: roundedRent,
              source: `HUD FMR FY${new Date().getFullYear()}`,
            },
          ],
          fetchedAt: now.toISOString(),
        },
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    }
  }

  // Deduplicate by zip_code+bedrooms — HUD file can have duplicate entries per ZIP.
  // PostgreSQL upsert fails if the same key appears twice in one batch.
  const dedupedRows = Array.from(
    new Map(cacheRows.map((r) => [`${r.zip_code}:${r.bedrooms}`, r])).values()
  );

  console.log(`\n✅  Cache rows prepared: ${dedupedRows.length.toLocaleString()} (${cacheRows.length - dedupedRows.length} duplicates removed)`);
  if (skipped > 0) console.log(`⚠️   Skipped ${skipped} rows with invalid ZIP codes`);

  // ── Dry run ────────────────────────────────────────────────────────────────

  if (isDryRun) {
    console.log("\n🔍  DRY RUN — first 5 rows:");
    console.log(JSON.stringify(cacheRows.slice(0, 5), null, 2));
    console.log("\n(No data written to Supabase)");
    return;
  }

  // ── Upsert in batches ──────────────────────────────────────────────────────

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  let inserted = 0;
  const totalBatches = Math.ceil(dedupedRows.length / batchSize);

  for (let i = 0; i < dedupedRows.length; i += batchSize) {
    const batch = dedupedRows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    const { error } = await supabase
      .from("rental_comps_cache")
      .upsert(batch, { onConflict: "zip_code,bedrooms" });

    if (error) {
      console.error(`❌  Batch ${batchNum}/${totalBatches} failed:`, error.message);
      // Continue with remaining batches — partial seed is better than none
    } else {
      inserted += batch.length;
      const pct = Math.round((batchNum / totalBatches) * 100);
      process.stdout.write(
        `\r   Progress: ${batchNum}/${totalBatches} batches (${pct}%) — ${inserted.toLocaleString()} rows inserted`
      );
    }
  }

  console.log(`\n\n🎉  Seed complete! ${inserted.toLocaleString()} rows in rental_comps_cache.`);
  console.log(
    `   Expires: ${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
  );
  console.log(`   Re-run next October with the FY${new Date().getFullYear() + 1} file.\n`);
}

main().catch((err: unknown) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
