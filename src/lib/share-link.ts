import { calculatorInputsSchema } from "@/lib/validations";
import type { CalculatorInputs } from "@/types";

/**
 * Encode calculator inputs as a URL-safe base64 string.
 * Replaces +/= with URL-safe characters.
 */
export function encodeInputs(inputs: CalculatorInputs): string {
  const json = JSON.stringify(inputs);
  return btoa(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decode a base64 URL param back to validated CalculatorInputs.
 * Returns null if the param is missing, malformed, or fails schema validation.
 * Uses Zod's default strip mode to discard unknown fields and .default(0) for backwards compat.
 */
export function decodeInputs(encoded: string): CalculatorInputs | null {
  if (!encoded || encoded.length > 2048) return null;
  try {
    // Restore standard base64 from URL-safe encoding
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);
    const validated = calculatorInputsSchema.safeParse(parsed);
    if (!validated.success) return null;
    return validated.data as CalculatorInputs;
  } catch {
    return null;
  }
}
