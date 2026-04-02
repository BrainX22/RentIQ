import { z } from "zod";

export const calculatorInputsSchema = z.object({
  propertyPrice: z.number().positive().max(100_000_000),
  downPaymentPercent: z.number().min(0).max(100),
  interestRate: z.number().min(0).max(30),
  loanTermYears: z.number().refine((v) => [15, 20, 30].includes(v), {
    message: "Loan term must be 15, 20, or 30 years",
  }),
  monthlyRent: z.number().positive().max(1_000_000),
  propertyTaxYearly: z.number().min(0).max(10_000_000),
  insuranceMonthly: z.number().min(0).max(100_000),
  hoaFeesMonthly: z.number().min(0).max(50_000),
  maintenancePercent: z.number().min(0).max(100),
  vacancyPercent: z.number().min(0).max(100),
  propertyManagementPercent: z.number().min(0).max(100).default(0),
  closingCostsPercent: z.number().min(0).max(20).default(0),
});

export const savePropertySchema = z.object({
  propertyName: z.string().min(1).max(200).trim(),
  inputs: calculatorInputsSchema,
});

export const uuidSchema = z.string().uuid();

export const watchlistCriteriaSchema = z.object({
  city: z.string().max(120).optional(),
  maxPrice: z.number().min(0).nullable().optional(),
  minTargetReturn: z.number().min(0).nullable().optional(),
  emailDigest: z.boolean().optional(),
});

export const urlSchema = z.object({
  url: z.string().url(),
});

export const monthlyActualSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(new Date().getFullYear() + 10),
  actual_rent: z.number().min(0).max(10_000_000),
  actual_expenses: z.number().min(0).max(10_000_000),
  notes: z.string().max(500).nullable().optional(),
});

/** Query params for GET /api/neighborhood */
export const neighborhoodQuerySchema = z.object({
  zip_code: z
    .string()
    .regex(/^\d{5}$/, "ZIP code must be exactly 5 digits"),
});

/** Query params for GET /api/comps */
export const compsQuerySchema = z.object({
  zip_code: z
    .string()
    .regex(/^\d{5}$/, "ZIP code must be exactly 5 digits"),
  bedrooms: z.coerce
    .number()
    .int()
    .min(0, "Bedrooms must be 0 or more")
    .max(5, "Bedrooms must be 5 or fewer")
    .default(2),
});

/** Body for PATCH /api/deal-matches — dismiss a deal match by ID */
export const dismissMatchSchema = z.object({
  matchId: z.string().uuid("matchId must be a valid UUID"),
});

/** Body for PATCH /api/profile — update display name */
export const displayNameSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(50, "Display name must be 50 characters or fewer.")
    .regex(
      /^[^<>"'`;&|\\]+$/,
      "Display name may not contain special characters."
    ),
});

// ─── Feedback form ────────────────────────────────────────────────────────────

export const feedbackSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.union([z.string().email(), z.literal(""), z.undefined()]).optional(),
  message: z.string().min(1, "Message is required").max(2000),
});

export type FeedbackPayload = z.infer<typeof feedbackSchema>;

/** Body for POST /api/account/delete — type DELETE to confirm, include current password */
export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    message: "Type DELETE to confirm.",
  }),
  currentPassword: z.string().min(1, "Password is required to delete your account."),
});
