import { letterGradeToScore } from "./score";

const CRIMEGRADE_BASE = "https://crimegrade.org/safest-places";
const FETCH_TIMEOUT_MS = 5_000;

// Matches a letter grade (A+/A/A-/B+/B/B-/C+/C/C-/D+/D/D-/F) that is
// surrounded by non-alpha characters (e.g. HTML tags, whitespace, quotes).
// Uses a lookahead/lookbehind on non-letter chars to avoid matching sub-strings.
const GRADE_REGEX = /(?<![A-Za-z])([A-Fa-f][+\-]?|[Ff])(?![A-Za-z])/;

/**
 * Fetches a safety score (0–100) for the given ZIP code from CrimeGrade.org.
 *
 * CrimeGrade has no public JSON API, so we fetch the HTML page and parse the
 * letter grade.  This is inherently fragile — the site may change its markup
 * or block server-side requests.  Always fails silently (returns null).
 *
 * Uses a short 5-second timeout to avoid blocking the caller.
 */
export async function fetchCrimeGradeScore(zip: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${CRIMEGRADE_BASE}/${zip}/`, {
        signal: controller.signal,
        headers: {
          "User-Agent": "RPC-NeighborhoodBot/1.0 (rental property calculator; contact: support@rpc.app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    const html = await res.text();
    return parseGradeFromHtml(html);
  } catch {
    return null;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseGradeFromHtml(html: string): number | null {
  const match = GRADE_REGEX.exec(html);
  if (!match) return null;
  return letterGradeToScore(match[1]);
}
