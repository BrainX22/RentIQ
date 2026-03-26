import { createAdminClient } from "@/lib/supabase/admin";
import type { CachedCompsData, CompsResponse } from "@/types";

/**
 * Look up HUD Fair Market Rent data for a ZIP code and bedroom count.
 *
 * Returns CompsResponse when a non-expired cache row exists in
 * rental_comps_cache, or null when the ZIP has no data (cache miss,
 * before seeding, or unknown ZIP).
 *
 * Never throws — all errors are swallowed and returned as null so the
 * caller can degrade gracefully.
 */
export async function lookupFmr(
  zipCode: string,
  bedrooms: number
): Promise<CompsResponse | null> {
  if (!/^\d{5}$/.test(zipCode)) return null;

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("rental_comps_cache")
      .select("comps_json")
      .eq("zip_code", zipCode)
      .eq("bedrooms", bedrooms)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("[fmr-lookup] Supabase error:", error.message);
      return null;
    }

    if (!data) return null;

    const cached = data.comps_json as Partial<CachedCompsData>;

    if (!Array.isArray(cached?.comps) || typeof cached.marketMedian !== "number") {
      console.error("[fmr-lookup] Unexpected comps_json shape for ZIP", zipCode);
      return null;
    }

    return {
      available: true,
      source: "cache",
      comps: cached.comps,
      marketMedian: cached.marketMedian,
      fetchedAt: cached.fetchedAt ?? new Date().toISOString(),
      zip_code: zipCode,
      bedrooms,
    };
  } catch {
    return null;
  }
}
