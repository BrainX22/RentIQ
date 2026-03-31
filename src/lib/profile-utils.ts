/**
 * Derive a display name from an email address.
 *
 * Takes the part before `@`, splits on `.`, `_`, `-`, `+`,
 * takes the first segment, and capitalizes the first letter.
 *
 * Falls back to "User" if the email is empty or has no usable prefix.
 */
export function deriveDisplayName(email: string): string {
  const atIndex = email.indexOf("@");
  const prefix = atIndex > 0 ? email.slice(0, atIndex) : "";

  if (prefix.length === 0) return "User";

  const firstSegment = prefix.split(/[._\-+]/)[0];

  if (firstSegment.length === 0) return "User";

  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase();
}

/**
 * Calculate the number of days remaining until a given date.
 * Returns 0 for past dates, null input, or invalid date strings.
 */
export function calculateDaysRemaining(endDate: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return 0;
  const diff = end - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/**
 * Detect the auth provider from Supabase user app_metadata.
 *
 * Checks `providers` array (Supabase v2) first, then falls back
 * to `provider` string (Supabase v1).
 */
export function detectAuthProvider(
  appMetadata: Record<string, unknown> | null | undefined
): "email" | "google" {
  if (!appMetadata) return "email";

  const providers = appMetadata.providers;
  if (Array.isArray(providers) && providers.includes("google")) {
    return "google";
  }

  if (appMetadata.provider === "google") {
    return "google";
  }

  return "email";
}
