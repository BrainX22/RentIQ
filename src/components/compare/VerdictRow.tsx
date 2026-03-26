"use client";

import { useMemo } from "react";
import {
  computePropertyScores,
  getWinnerIndex,
  SCORE_WEIGHTS,
} from "@/lib/compare-scoring";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Property } from "@/types";

// ─── Component ────────────────────────────────────────────────────────────────

interface VerdictRowProps {
  properties: Property[];
}

export default function VerdictRow({ properties }: VerdictRowProps) {
  // Memoised so scores are not recomputed on every parent re-render
  const scores = useMemo(() => computePropertyScores(properties), [properties]);
  const winnerIdx = useMemo(() => getWinnerIndex(scores), [scores]);

  return (
    // Self-contained TooltipProvider so this component works anywhere in the tree
    <TooltipProvider>
      <div className="mt-3 overflow-x-auto rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 shadow-sm">
        <table className="min-w-full border-collapse">
          <tbody>
            <tr>
              {/* Row header — gives the score cells a semantic label for assistive tech */}
              <th
                scope="row"
                className="sticky left-0 z-10 w-36 min-w-[9rem] bg-indigo-50 px-5 py-4 text-left text-sm font-semibold text-indigo-900"
              >
                Verdict
              </th>

              {/* One cell per property */}
              {properties.map((p, i) => {
                const score = scores[i];
                const isWinner = i === winnerIdx;

                return (
                  <td key={p.id} className="px-5 py-4">
                    <Tooltip>
                      <TooltipTrigger
                        className="flex cursor-default flex-col items-start gap-1.5 text-left"
                        aria-label={`Score breakdown for ${p.property_name}`}
                      >
                        {isWinner && (
                          <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                            Best Deal
                          </span>
                        )}
                        <span className="font-mono text-sm text-gray-700">
                          Score: {score.totalScore.toFixed(1)}
                        </span>
                      </TooltipTrigger>

                      {/* Score breakdown shown on hover */}
                      <TooltipContent side="top" className="max-w-[13rem] p-3">
                        <p className="mb-2 text-xs font-semibold text-gray-900">
                          Score Breakdown
                        </p>
                        <ul className="space-y-1 text-xs text-gray-600">
                          <li className="flex justify-between gap-3">
                            <span>Cash Flow ({Math.round(SCORE_WEIGHTS.cashFlow * 100)}%)</span>
                            <span className="font-mono font-medium">{score.cashFlowScore.toFixed(1)}</span>
                          </li>
                          <li className="flex justify-between gap-3">
                            <span>CoC Return ({Math.round(SCORE_WEIGHTS.cocReturn * 100)}%)</span>
                            <span className="font-mono font-medium">{score.cocReturnScore.toFixed(1)}</span>
                          </li>
                          <li className="flex justify-between gap-3">
                            <span>Cap Rate ({Math.round(SCORE_WEIGHTS.capRate * 100)}%)</span>
                            <span className="font-mono font-medium">{score.capRateScore.toFixed(1)}</span>
                          </li>
                          <li className="flex justify-between gap-3">
                            <span>NOI ({Math.round(SCORE_WEIGHTS.noi * 100)}%)</span>
                            <span className="font-mono font-medium">{score.noiScore.toFixed(1)}</span>
                          </li>
                          <li className="flex justify-between gap-3">
                            <span>Price ({Math.round(SCORE_WEIGHTS.price * 100)}%)</span>
                            <span className="font-mono font-medium">{score.priceScore.toFixed(1)}</span>
                          </li>
                          <li className="mt-1.5 flex justify-between gap-3 border-t border-gray-100 pt-1.5 font-semibold text-gray-900">
                            <span>Total</span>
                            <span className="font-mono">{score.totalScore.toFixed(1)}</span>
                          </li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
