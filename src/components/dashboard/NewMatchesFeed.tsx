"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { DealMatch } from "@/types";

interface Props {
  planType: "free" | "pro" | "max";
}

function formatMatchedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function GradeBadge({ grade, score }: { grade: DealMatch["deal_grade"]; score: number }) {
  const label = `${grade} (${score})`;

  if (grade === "A") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        {label}
      </span>
    );
  }

  if (grade === "B") {
    return (
      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
        {label}
      </span>
    );
  }

  // C / D — should not reach here (API only stores A/B) but render a neutral fallback
  return (
    <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
      {label}
    </span>
  );
}

interface MatchCardProps {
  match: DealMatch;
  onDismiss: (matchId: string) => void;
}

function MatchCard({ match, onDismiss }: MatchCardProps) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{match.property_name}</p>
          <p className="text-xs text-gray-400">{formatMatchedAt(match.matched_at)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <GradeBadge grade={match.deal_grade} score={match.deal_score_value} />
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(match.id)}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-400">Price</dt>
          <dd className="font-mono text-gray-900">{formatCurrency(match.property_price)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Monthly Cash Flow</dt>
          <dd
            className={`font-mono ${
              match.est_monthly_cash_flow >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatCurrency(match.est_monthly_cash_flow)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-400">Cash-on-Cash</dt>
          <dd className="font-mono text-gray-900">
            {match.est_cash_on_cash_return === null
              ? "N/A"
              : formatPercent(match.est_cash_on_cash_return)}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <a
          href={`/calculator?load=${match.property_id}`}
          className="text-xs text-orange-600 hover:underline"
        >
          View Property
        </a>
      </div>
    </div>
  );
}

export default function NewMatchesFeed({ planType }: Props) {
  const [matches, setMatches] = useState<DealMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);

  useEffect(() => {
    if (planType !== "max") return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchMatches = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/deal-matches", { signal: controller.signal });
        const payload = (await res.json()) as { data?: { matches: DealMatch[] }; error?: string };
        if (!cancelled) {
          if (!res.ok) {
            setError(payload.error ?? "Could not load deal matches.");
          } else {
            setMatches(payload.data?.matches ?? []);
          }
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") {
          setError("Could not load deal matches. Please try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchMatches();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [planType]);

  const handleDismiss = async (matchId: string) => {
    // Capture the current state snapshot (for rollback)
    const snapshot = [...matches];

    // Optimistic removal
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    setDismissError(null);

    try {
      const res = await fetch("/api/deal-matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setMatches(snapshot);
        setDismissError(payload.error ?? "Could not dismiss match.");
        setTimeout(() => setDismissError(null), 5000);
      }
    } catch {
      setMatches(snapshot);
      setDismissError("Could not dismiss match. Please try again.");
      setTimeout(() => setDismissError(null), 5000);
    }
  };

  // ── Upgrade prompt for non-Max plans ──────────────────────────────────────
  if (planType !== "max") {
    return (
      <section className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-5">
        <h2 className="text-lg font-semibold text-violet-900">New Matches Feed</h2>
        <p className="mt-1 text-sm font-medium text-violet-800">
          Upgrade to Max to unlock Deal Finder
        </p>
        <p className="mt-1 text-sm text-violet-700">
          Get daily A/B-grade deal matches based on your watchlist criteria.
        </p>
      </section>
    );
  }

  // ── Max plan feed ─────────────────────────────────────────────────────────
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">New Matches Feed</h2>
        <p className="text-sm text-gray-500">
          A/B-grade deals found matching your watchlist criteria.
        </p>
      </div>

      {dismissError && (
        <div className="mb-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
          {dismissError}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-gray-500">
          No deal matches yet. Add properties and set watchlist criteria to start finding A/B-grade
          deals.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} onDismiss={handleDismiss} />
          ))}
        </div>
      )}
    </section>
  );
}
