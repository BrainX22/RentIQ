"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { calculateMonthlyMortgage } from "@/lib/calculations";

// ─── Mini Calculator ─────────────────────────────────────────────────────────

const DEFAULT_PRICE = 350000;
const DEFAULT_RENT = 2400;
const DEFAULT_RATE = 7.0;
const DOWN_PAYMENT_PCT = 0.2;
const LOAN_TERM = 30;
// Fixed operating assumptions for the landing preview
const MONTHLY_TAX = 350;      // ~1.2% of $350k / 12
const INSURANCE = 100;
const MAINTENANCE_PCT = 0.10;
const VACANCY_PCT = 0.05;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function parseCurrency(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function calcMonthlyCashFlow(price: number, rent: number, rate: number): number {
  const principal = price * (1 - DOWN_PAYMENT_PCT);
  const mortgage = calculateMonthlyMortgage(principal, rate, LOAN_TERM);
  const maintenance = rent * MAINTENANCE_PCT;
  const vacancy = rent * VACANCY_PCT;
  const totalExpenses = mortgage + MONTHLY_TAX + INSURANCE + maintenance + vacancy;
  return rent - totalExpenses;
}

// ─── Hero Component ───────────────────────────────────────────────────────────

export default function Hero() {
  const [price, setPrice] = useState(DEFAULT_PRICE);
  const [priceDisplay, setPriceDisplay] = useState(
    DEFAULT_PRICE.toLocaleString("en-US")
  );
  const [rent, setRent] = useState(DEFAULT_RENT);
  const [rentDisplay, setRentDisplay] = useState(
    DEFAULT_RENT.toLocaleString("en-US")
  );
  const [rate, setRate] = useState(DEFAULT_RATE);

  const cashFlow = useMemo(
    () => calcMonthlyCashFlow(price, rent, rate),
    [price, rent, rate]
  );

  const isPositive = cashFlow >= 0;

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      {/* Subtle background gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,22,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-5xl">
        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            <TrendingUp className="h-3 w-3" />
            Trusted by 100+ real estate investors
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Know if a rental property
          <br />
          <span className="text-orange-500">makes money in 30 seconds</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-relaxed text-gray-500">
          Calculate cash flow, cap rate, and return on investment for any rental property.
          No spreadsheet. No guesswork. Free to start.
        </p>

        {/* ── Interactive Mini Calculator ─────────────────────────────── */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-100/60 ring-1 ring-gray-900/5">
            {/* Card header */}
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Quick Analysis
              </p>
            </div>

            {/* Inputs row */}
            <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
              {/* Property Price */}
              <div className="space-y-1.5">
                <label
                  htmlFor="hero-price"
                  className="block text-xs font-medium text-gray-500"
                >
                  Property Price
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                    $
                  </span>
                  <input
                    id="hero-price"
                    type="text"
                    inputMode="numeric"
                    value={priceDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      const num = parseInt(raw || "0", 10);
                      setPrice(num);
                      setPriceDisplay(num ? num.toLocaleString("en-US") : "");
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-7 pr-3 font-mono text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                    placeholder="350,000"
                    aria-label="Property price in dollars"
                  />
                </div>
              </div>

              {/* Monthly Rent */}
              <div className="space-y-1.5">
                <label
                  htmlFor="hero-rent"
                  className="block text-xs font-medium text-gray-500"
                >
                  Monthly Rent
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                    $
                  </span>
                  <input
                    id="hero-rent"
                    type="text"
                    inputMode="numeric"
                    value={rentDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      const num = parseInt(raw || "0", 10);
                      setRent(num);
                      setRentDisplay(num ? num.toLocaleString("en-US") : "");
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-7 pr-3 font-mono text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                    placeholder="2,400"
                    aria-label="Expected monthly rent in dollars"
                  />
                </div>
              </div>

              {/* Interest Rate */}
              <div className="space-y-1.5">
                <label
                  htmlFor="hero-rate"
                  className="block text-xs font-medium text-gray-500"
                >
                  Interest Rate
                </label>
                <div className="relative">
                  <input
                    id="hero-rate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step={0.1}
                    value={rate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setRate(isNaN(v) ? 0 : Math.max(0, Math.min(20, v)));
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-8 font-mono text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                    placeholder="7.0"
                    aria-label="Annual interest rate percentage"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Result row */}
            <div className="flex flex-col items-start justify-between gap-4 border-t border-gray-100 px-6 py-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  Estimated Monthly Cash Flow
                </p>
                <p
                  className={`mt-0.5 font-mono text-3xl font-bold tabular-nums ${
                    isPositive ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrency(cashFlow)}
                  <span className="ml-1 text-base font-medium opacity-60">/mo</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {isPositive
                    ? "This property cash-flows positively with standard assumptions."
                    : "Adjust rent or price — this deal currently runs at a loss."}
                </p>
              </div>

              <Link
                href="/calculator"
                className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow-md active:scale-[0.98]"
              >
                Full Analysis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Disclaimer */}
            <div className="rounded-b-2xl border-t border-gray-100 bg-gray-50/60 px-6 py-2.5">
              <p className="text-[11px] text-gray-400">
                Assumes 20% down · 30yr term · 10% maintenance · 5% vacancy · estimates only
              </p>
            </div>
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="mt-6 flex justify-center">
          <Link
            href="#pricing"
            className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
          >
            See all plans & pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
