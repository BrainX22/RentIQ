"use client";

import { calculateDealScore } from "@/lib/calculations";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CalculatorResults } from "@/types";
import {
  ArrowUpDown,
  Building2,
  DollarSign,
  Info,
  Percent,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

// ─── Metric descriptions ──────────────────────────────────────────────────────

const METRIC_DESCRIPTIONS: Record<string, string> = {
  "Cash-on-Cash Return":
    "Annual cash flow divided by total cash invested. A good rental target is 8–12%.",
  "Annual Cash Flow":
    "Total rent collected minus all expenses and mortgage payments over 12 months.",
  "Cap Rate":
    "Net Operating Income divided by property price. Measures yield independent of financing.",
  "NOI (Annual)":
    "Gross rent minus operating expenses (no mortgage). Used to compare properties.",
  "Down Payment":
    "Upfront cash required at purchase based on your down payment percentage.",
  "Monthly Mortgage":
    "Principal + interest payment based on loan amount, rate, and term.",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  results: CalculatorResults;
  /** HUD Fair Market Rent benchmark passed down from RentalComps — shown as annotation. */
  marketMedian?: number | null;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorize?: boolean;
  positive?: boolean;
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, colorize = false, positive = true }: MetricCardProps) {
  const description = METRIC_DESCRIPTIONS[label];

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Use div+span so the TooltipTrigger button is never nested inside a <p> */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
        {description && (
          <Tooltip>
            <TooltipTrigger
              aria-label={`What is ${label}?`}
              className="rounded text-gray-300 transition-colors hover:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Info className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <p
        className={cn(
          "mt-1.5 font-mono text-lg font-bold",
          colorize ? (positive ? "text-emerald-600" : "text-red-600") : "text-gray-900"
        )}
      >
        {value}
      </p>
      <div className="absolute right-3 top-3 text-gray-300">{icon}</div>
    </div>
  );
}

// ─── CalculatorResults ────────────────────────────────────────────────────────

export default function CalculatorResults({ results, marketMedian }: Props) {
  // Animated values — each number transitions smoothly over ~300ms when inputs change.
  const animMonthlyCashFlow = useAnimatedNumber(results.monthlyCashFlow);
  const animAnnualCashFlow = useAnimatedNumber(results.annualCashFlow);
  const animCocReturn = useAnimatedNumber(results.cashOnCashReturn ?? 0);
  const animCapRate = useAnimatedNumber(results.capRate);
  const animNoi = useAnimatedNumber(results.noi);
  const animDownPayment = useAnimatedNumber(results.downPaymentAmount);
  const animMonthlyMortgage = useAnimatedNumber(results.monthlyMortgage);

  // Drive colour from the animated value so the card colour tracks the number
  // animation rather than snapping ahead of it.
  const isPositive = animMonthlyCashFlow >= 0;
  const cocReturn = results.cashOnCashReturn;
  const animCocIsPositive = animCocReturn >= 0;
  const dealScore = calculateDealScore({
    monthlyCashFlow: results.monthlyCashFlow,
    cashOnCashReturn: results.cashOnCashReturn,
    capRate: results.capRate,
  });

  return (
    <div className="space-y-4">
      {/* ── Hero: Monthly Cash Flow ───────────────────────────────────────────── */}
      <div
        className={cn(
          "rounded-xl border p-6",
          isPositive
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Monthly Cash Flow
          </p>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-bold tracking-widest",
              isPositive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {isPositive ? "PROFITABLE" : "LOSING MONEY"}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs">
            <span className="text-gray-600">Deal Score</span>
            <span className="font-mono font-bold text-orange-600">{dealScore.grade}</span>
            <span className="font-mono text-orange-400">({dealScore.score}/100)</span>
          </div>
          {marketMedian != null && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs">
              <span className="text-gray-500">Market benchmark:</span>
              <span className="font-mono font-semibold text-violet-700">
                {formatCurrency(marketMedian)}/mo
              </span>
              <span className="text-gray-400">(HUD FMR)</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-end gap-2">
          {isPositive ? (
            <TrendingUp className="mb-1 h-8 w-8 shrink-0 text-emerald-600" />
          ) : (
            <TrendingDown className="mb-1 h-8 w-8 shrink-0 text-red-600" />
          )}
          <span
            className={cn(
              "font-mono text-5xl font-bold leading-none",
              isPositive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {formatCurrency(animMonthlyCashFlow)}
          </span>
          <span className="mb-1.5 text-sm text-gray-400">/mo</span>
        </div>
      </div>

      {/* ── Metrics Grid ─────────────────────────────────────────────────────── */}
      {/* Single TooltipProvider wraps all cards so they share one delay group —  */}
      {/* once one tooltip opens, the rest open instantly without re-triggering.  */}
      <TooltipProvider>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Cash-on-Cash Return"
          value={cocReturn !== null ? formatPercent(animCocReturn) : "∞"}
          icon={<Percent className="h-4 w-4" />}
          colorize
          positive={cocReturn !== null ? animCocIsPositive : true}
        />
        <MetricCard
          label="Annual Cash Flow"
          value={formatCurrency(animAnnualCashFlow)}
          icon={<DollarSign className="h-4 w-4" />}
          colorize
          positive={animAnnualCashFlow >= 0}
        />
        <MetricCard
          label="Cap Rate"
          value={formatPercent(animCapRate)}
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard
          label="NOI (Annual)"
          value={formatCurrency(animNoi)}
          icon={<TrendingUp className="h-4 w-4" />}
          colorize
          positive={animNoi >= 0}
        />
        <MetricCard
          label="Down Payment"
          value={formatCurrency(animDownPayment)}
          icon={<ArrowUpDown className="h-4 w-4" />}
        />
        <MetricCard
          label="Monthly Mortgage"
          value={formatCurrency(animMonthlyMortgage)}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>
      </TooltipProvider>
    </div>
  );
}
