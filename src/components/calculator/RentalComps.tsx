"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, BarChart3, Info, Loader2 } from "lucide-react";

// ─── Response validation schema ───────────────────────────────────────────────
// Validates the shape of a successful /api/comps response before trusting it.

const rentalCompSchema = z.object({
  beds: z.number(),
  rent: z.number(),
  source: z.string(),
});

const compsResponseSchema = z.object({
  available: z.literal(true),
  source: z.literal("cache"),
  comps: z.array(rentalCompSchema),
  marketMedian: z.number(),
  fetchedAt: z.string(),
  zip_code: z.string(),
  bedrooms: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Current monthly rent from the calculator — used to detect above-market pricing. */
  monthlyRent: number;
  /** Called whenever the market median changes (or becomes unavailable). */
  onMedianFetched: (median: number | null) => void;
}

type CompsData = z.infer<typeof compsResponseSchema>;

type MissResponse = {
  available: false;
  zip_code: string;
  bedrooms: number;
  message: string;
};

// ─── Bedroom options ──────────────────────────────────────────────────────────

const BEDROOM_OPTIONS = [
  { value: 0, label: "Studio" },
  { value: 1, label: "1 BR" },
  { value: 2, label: "2 BR" },
  { value: 3, label: "3 BR" },
  { value: 4, label: "4 BR" },
  { value: 5, label: "5 BR" },
] as const;

// ─── RentalComps ──────────────────────────────────────────────────────────────

export default function RentalComps({ monthlyRent, onMedianFetched }: Props) {
  const [zipCode, setZipCode] = useState("");
  const [bedrooms, setBedrooms] = useState("2");
  const [isLoading, setIsLoading] = useState(false);
  const [comps, setComps] = useState<CompsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchComps = async () => {
    if (zipCode.length !== 5) return;
    setIsLoading(true);
    setError(null);
    setComps(null);

    try {
      const res = await fetch(`/api/comps?zip_code=${zipCode}&bedrooms=${bedrooms}`);
      const data = (await res.json()) as CompsData | MissResponse | { error?: string };

      if (!res.ok) {
        const errMsg =
          (data as { error?: string }).error ?? "Failed to fetch market data.";
        setError(errMsg);
        onMedianFetched(null);
        return;
      }

      if (!(data as CompsData).available) {
        const miss = data as MissResponse;
        setError(miss.message ?? "No market data available for this ZIP code.");
        onMedianFetched(null);
        return;
      }

      const validated = compsResponseSchema.safeParse(data);
      if (!validated.success) {
        setError("Received unexpected data from market data service.");
        onMedianFetched(null);
        return;
      }

      const hit = validated.data;
      setComps(hit);
      onMedianFetched(hit.marketMedian);
    } catch {
      setError("Could not connect to market data service.");
      onMedianFetched(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Warn if user's rent is more than 15% above the market median.
  const isAboveMarket =
    comps?.marketMedian != null && monthlyRent > comps.marketMedian * 1.15;
  const pctAbove =
    comps?.marketMedian != null
      ? Math.round(((monthlyRent - comps.marketMedian) / comps.marketMedian) * 100)
      : 0;

  const formattedDate =
    comps?.fetchedAt
      ? new Date(comps.fetchedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        })
      : null;

  const bedroomLabel =
    BEDROOM_OPTIONS.find((o) => String(o.value) === String(comps?.bedrooms ?? bedrooms))
      ?.label ?? `${bedrooms} BR`;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-violet-900">Rental Market Comps</h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
          Max
        </span>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {/* ZIP code */}
        <div className="flex-1">
          <Label htmlFor="comps-zip" className="text-xs text-gray-600">
            ZIP Code
          </Label>
          <Input
            id="comps-zip"
            value={zipCode}
            onChange={(e) =>
              setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            placeholder="e.g. 94102"
            className="mt-1 h-8 text-sm"
            maxLength={5}
            onKeyDown={(e) => e.key === "Enter" && fetchComps()}
          />
        </div>

        {/* Bedrooms */}
        <div className="w-24">
          <Label htmlFor="comps-beds" className="text-xs text-gray-600">
            Beds
          </Label>
          <select
            id="comps-beds"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {BEDROOM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Fetch button */}
        <div className="flex items-end">
          <Button
            onClick={fetchComps}
            disabled={isLoading || zipCode.length !== 5}
            size="sm"
            className="h-8 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Fetch"
            )}
          </Button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {comps && !error && (
        <div className="mt-3 space-y-2">
          {/* Main benchmark card */}
          <div className="rounded-lg border border-violet-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                HUD Fair Market Rent · {bedroomLabel} · ZIP {comps.zip_code}
              </span>
              {formattedDate && (
                <span className="text-xs text-gray-400">{formattedDate}</span>
              )}
            </div>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="font-mono text-2xl font-bold text-violet-700">
                {formatCurrency(comps.marketMedian)}
              </span>
              <span className="mb-1 text-xs text-gray-500">/mo market benchmark</span>
            </div>
          </div>

          {/* Above-market rent warning */}
          {isAboveMarket && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800">
                Your rent ({formatCurrency(monthlyRent)}/mo) is{" "}
                <strong>{pctAbove}% above market</strong>. Consider increasing
                your vacancy rate to account for longer vacancy periods.
              </p>
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-1.5">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
            <p className="text-xs text-gray-400">
              HUD Fair Market Rent is the 40th percentile rent — a good
              benchmark for tenant affordability and market positioning.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
