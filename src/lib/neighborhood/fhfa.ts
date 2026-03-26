import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeGrowthPct } from "./score";

/**
 * FHFA House Price Index — ZIP3-level data.
 *
 * Queries pre-seeded data from the fhfa_zip3_hpi Supabase table.
 * Data is seeded once via: npx tsx scripts/seed-fhfa-data.ts
 * Re-seed annually (each October) with the latest FHFA HPI file.
 *
 * Returns a 0–100 growth score for the given ZIP code, or null if
 * the ZIP3 prefix is not in the table (unseeded area).
 *
 * Never throws — all errors return null.
 */
export async function fetchFhfaScore(zip: string): Promise<number | null> {
  try {
    const zip3 = zip.slice(0, 3);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("fhfa_zip3_hpi")
      .select("hpi_1yr_pct_chg")
      .eq("zip3", zip3)
      .maybeSingle();

    if (error || !data) return null;

    const pct = Number(data.hpi_1yr_pct_chg);
    if (isNaN(pct)) return null;

    return normalizeGrowthPct(pct);
  } catch {
    return null;
  }
}
