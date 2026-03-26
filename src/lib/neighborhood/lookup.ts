import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFhfaScore } from "./fhfa";
import { fetchCrimeGradeScore } from "./crimegrade";
import { fetchCensusIncomeScore } from "./census";
import { computeCompositeScore, letterGradeToScore, normalizeGrowthPct } from "./score";
import type { NeighborhoodResponse } from "@/types";

const CACHE_TTL_DAYS = 7;

/**
 * Cache-first neighborhood lookup for a ZIP code.
 *
 * 1. Checks neighborhood_cache (filtered by expires_at > now).
 * 2. On miss: fetches all 3 external APIs in parallel (Promise.allSettled).
 * 3. Stores result in neighborhood_cache (7-day TTL).
 * 4. Returns a NeighborhoodResponse — always available:true even when all
 *    sources fail (composite defaults to 50, grade C).
 * 5. Never throws — all errors return null.
 */
export async function lookupNeighborhood(
  zipCode: string
): Promise<NeighborhoodResponse | null> {
  if (!/^\d{5}$/.test(zipCode)) return null;

  try {
    // ── 1. Cache read ──────────────────────────────────────────────────────
    const admin = createAdminClient();
    const { data: cached, error: readError } = await admin
      .from("neighborhood_cache")
      .select("safety_score, school_rating, growth_score, raw_json, fetched_at, expires_at")
      .eq("zip_code", zipCode)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!readError && cached) {
      return buildResponseFromCache(zipCode, cached);
    }

    // ── 2. Cache miss: parallel API fetch ─────────────────────────────────
    const [safetyResult, incomeResult, growthResult] = await Promise.allSettled([
      fetchCrimeGradeScore(zipCode),
      fetchCensusIncomeScore(zipCode),
      fetchFhfaScore(zipCode),
    ]);

    const safetyScore =
      safetyResult.status === "fulfilled" ? safetyResult.value : null;
    const incomeScore =
      incomeResult.status === "fulfilled" ? incomeResult.value : null;
    const growthScore =
      growthResult.status === "fulfilled" ? growthResult.value : null;

    const scores = computeCompositeScore(safetyScore, incomeScore, growthScore);
    const fetchedAt = new Date().toISOString();

    // ── 3. Upsert into cache (fire-and-forget; failure must not block caller)
    try {
      const expiresAt = new Date(
        Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      await admin.from("neighborhood_cache").upsert(
        {
          zip_code: zipCode,
          // safety_score stores the raw letter grade; derive from numeric score
          safety_score: safetyScore !== null ? scoreToLetter(safetyScore) : null,
          school_rating: incomeScore,      // repurposed column: census income 0-100
          growth_score: growthScore !== null ? scoreToRawPct(growthScore) : null,
          raw_json: { safetyScore, incomeScore, growthScore },
          fetched_at: fetchedAt,
          expires_at: expiresAt,
        },
        { onConflict: "zip_code" }
      );
    } catch (upsertErr) {
      // Log but don't block caller — cache is best-effort
      console.error("[neighborhood-cache] upsert error:", upsertErr);
    }

    return {
      available: true,
      zip_code: zipCode,
      scores,
      fetchedAt,
    };
  } catch {
    return null;
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

interface CachedRow {
  safety_score: string | null;
  school_rating: number | null;
  growth_score: number | null;
  fetched_at: string | null;
  /** Stores the exact 0-100 numeric scores — preferred over column round-trips. */
  raw_json: { safetyScore?: number | null; incomeScore?: number | null; growthScore?: number | null } | null;
}

function buildResponseFromCache(
  zipCode: string,
  row: CachedRow
): NeighborhoodResponse {
  // Prefer exact numeric scores stored in raw_json (avoids lossy letter-grade round-trip).
  // Fall back to column-based reconstruction for rows written before this fix.
  const safety =
    row.raw_json?.safetyScore != null
      ? row.raw_json.safetyScore
      : row.safety_score != null
        ? letterGradeToScore(row.safety_score)
        : null;
  const income =
    row.raw_json?.incomeScore != null
      ? row.raw_json.incomeScore
      : row.school_rating != null
        ? Number(row.school_rating)
        : null;
  const growth =
    row.raw_json?.growthScore != null
      ? row.raw_json.growthScore
      : row.growth_score != null
        ? normalizeGrowthPct(Number(row.growth_score))
        : null;

  const scores = computeCompositeScore(safety, income, growth);

  return {
    available: true,
    zip_code: zipCode,
    scores,
    fetchedAt: row.fetched_at ?? new Date().toISOString(),
  };
}

/** Converts a numeric 0-100 safety score back to the nearest letter grade. */
function scoreToLetter(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 88) return "A";
  if (score >= 81) return "A-";
  if (score >= 75) return "B+";
  if (score >= 68) return "B";
  if (score >= 61) return "B-";
  if (score >= 55) return "C+";
  if (score >= 48) return "C";
  if (score >= 41) return "C-";
  if (score >= 35) return "D+";
  if (score >= 28) return "D";
  if (score >= 21) return "D-";
  return "F";
}

/** Converts a normalised 0-100 growth score back to a raw FHFA percentage. */
function scoreToRawPct(score: number): number {
  return (score / 100) * 6;
}
