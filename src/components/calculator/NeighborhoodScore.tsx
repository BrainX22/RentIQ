"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, MapPin, Loader2 } from "lucide-react";

// ─── Response validation schema ───────────────────────────────────────────────

const neighborhoodScoresSchema = z.object({
  composite: z.number(),
  safety: z.number().nullable(),
  income: z.number().nullable(),
  growth: z.number().nullable(),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  sources: z.array(z.string()),
});

const neighborhoodResponseSchema = z.object({
  available: z.literal(true),
  zip_code: z.string(),
  scores: neighborhoodScoresSchema,
  fetchedAt: z.string(),
});

type NeighborhoodData = z.infer<typeof neighborhoodResponseSchema>;

// ─── Grade colour mapping ─────────────────────────────────────────────────────

const GRADE_COLOURS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-300",
  B: "bg-blue-100 text-blue-800 border-blue-300",
  C: "bg-amber-100 text-amber-800 border-amber-300",
  D: "bg-orange-100 text-orange-800 border-orange-300",
  F: "bg-red-100 text-red-800 border-red-300",
};

const SCORE_BAR_COLOURS: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Current vacancy % from the calculator — used to suggest an adjusted value. */
  vacancyPercent: number;
  /** Called when the user clicks "Apply Suggestion" with the new vacancy %. */
  onApplySuggestion: (newVacancy: number) => void;
}

// ─── Sub-score row ────────────────────────────────────────────────────────────

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="w-16 text-xs text-gray-600">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-violet-400"
            style={{ width: value != null ? `${value}%` : "0%" }}
          />
        </div>
        <span className="w-8 text-right font-mono text-xs text-gray-700">
          {value != null ? value : "N/A"}
        </span>
      </div>
    </div>
  );
}

// ─── NeighborhoodScore ────────────────────────────────────────────────────────

export default function NeighborhoodScore({
  vacancyPercent,
  onApplySuggestion,
}: Props) {
  const [zipCode, setZipCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<NeighborhoodData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const fetchScore = async () => {
    if (zipCode.length !== 5) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    setUnavailable(false);

    try {
      const res = await fetch(`/api/neighborhood?zip_code=${encodeURIComponent(zipCode)}`);
      const json = (await res.json()) as unknown;

      if (!res.ok) {
        const errMsg =
          (json as { error?: string }).error ?? "Failed to fetch neighborhood data.";
        setError(errMsg);
        return;
      }

      // Handle available:false
      if ((json as { available?: boolean }).available === false) {
        setUnavailable(true);
        return;
      }

      const parsed = neighborhoodResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError("Received unexpected data from neighborhood service.");
        return;
      }

      setData(parsed.data);
    } catch {
      setError("Could not connect to neighborhood service.");
    } finally {
      setIsLoading(false);
    }
  };

  const showAdvisory =
    data != null && data.scores.safety != null && data.scores.safety < 60;
  const suggestedVacancy = vacancyPercent + 3;

  const gradeColour = data ? (GRADE_COLOURS[data.scores.grade] ?? GRADE_COLOURS.C) : "";
  const barColour = data ? (SCORE_BAR_COLOURS[data.scores.grade] ?? SCORE_BAR_COLOURS.C) : "";

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-violet-900">Neighborhood Score</h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
          Max
        </span>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="nbhd-zip" className="text-xs text-gray-600">
            ZIP Code
          </Label>
          <Input
            id="nbhd-zip"
            value={zipCode}
            onChange={(e) =>
              setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            placeholder="e.g. 90210"
            className="mt-1 h-8 text-sm"
            maxLength={5}
            onKeyDown={(e) => e.key === "Enter" && fetchScore()}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={fetchScore}
            disabled={isLoading || zipCode.length !== 5}
            size="sm"
            className="h-8 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Analyze"
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

      {/* ── Unavailable ────────────────────────────────────────────────────── */}
      {unavailable && !isLoading && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">
            Neighborhood data is not available for this ZIP code.
          </p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {data && !error && (
        <div className="mt-3 space-y-3">
          {/* Grade + composite bar */}
          <div className="flex items-center gap-3 rounded-lg border border-violet-100 bg-white p-3">
            <span
              data-testid="grade-badge"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg font-bold ${gradeColour}`}
            >
              {data.scores.grade}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Composite Score</span>
                <span className="font-mono text-sm font-semibold text-gray-800">
                  {data.scores.composite}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${barColour}`}
                  style={{ width: `${data.scores.composite}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sub-score breakdowns */}
          <div className="space-y-1.5 rounded-lg border border-violet-100 bg-white p-3">
            <ScoreRow label="Safety" value={data.scores.safety} />
            <ScoreRow label="Income" value={data.scores.income} />
            <ScoreRow label="Growth" value={data.scores.growth} />
          </div>

          {/* Safety advisory */}
          {showAdvisory && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="text-xs text-amber-800">
                    <strong>High vacancy risk area</strong> — consider adjusting
                    your vacancy rate to {suggestedVacancy}% to account for
                    higher tenant turnover.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 border-amber-300 bg-amber-100 text-xs text-amber-800 hover:bg-amber-200"
                    onClick={() => onApplySuggestion(suggestedVacancy)}
                  >
                    Apply Suggestion
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sources note */}
          {data.scores.sources.length > 0 && (
            <p className="text-xs text-gray-400">
              Data sources: {data.scores.sources.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
