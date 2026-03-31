import type React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── UI Mockups ───────────────────────────────────────────────────────────────

function CalculatorMockup() {
  return (
    <div
      className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-lg shadow-gray-100/60 select-none"
      aria-hidden="true"
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Quick Analysis
      </p>
      <div className="mb-4 space-y-2">
        {(
          [
            { label: "Property Price", value: "$350,000" },
            { label: "Monthly Rent", value: "$2,400" },
            { label: "Interest Rate", value: "7.0%" },
          ] as const
        ).map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <span className="text-xs text-gray-400">{label}</span>
            <span className="font-mono text-sm font-medium text-gray-800">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
          <span className="text-xs font-medium text-orange-600">Monthly Cash Flow</span>
          <span className="font-mono text-base font-bold text-emerald-600">+$347</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { label: "Cap Rate", value: "5.8%", color: "text-emerald-600" },
            { label: "CoC Return", value: "7.2%", color: "text-emerald-600" },
            { label: "Deal Score", value: "A", color: "text-orange-500" },
          ] as const
        ).map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-center"
          >
            <p className="text-[10px] text-gray-400">{label}</p>
            <p className={cn("font-mono text-sm font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonMockup() {
  const rows: { metric: string; vals: [string, string, string]; winner: number }[] = [
    { metric: "Cash Flow", vals: ["+$210", "+$347", "+$95"], winner: 1 },
    { metric: "CoC Return", vals: ["5.8%", "7.2%", "4.1%"], winner: 1 },
    { metric: "Cap Rate", vals: ["5.1%", "5.8%", "4.6%"], winner: 1 },
    { metric: "Deal Score", vals: ["B", "A", "C"], winner: 1 },
  ];

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-lg shadow-gray-100/60 select-none"
      aria-hidden="true"
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Compare Properties
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left font-normal text-gray-400" />
              {(["123 Oak St", "456 Elm Ave ★", "789 Pine Rd"] as const).map(
                (name, i) => (
                  <th
                    key={name}
                    className={cn(
                      "pb-2 text-center font-semibold",
                      i === 1 ? "text-emerald-700" : "text-gray-500"
                    )}
                  >
                    {name}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(({ metric, vals, winner }) => (
              <tr key={metric}>
                <td className="py-2 pr-3 text-gray-400">{metric}</td>
                {vals.map((v, i) => (
                  <td
                    key={v}
                    className={cn(
                      "py-2 text-center font-mono",
                      i === winner
                        ? "font-bold text-emerald-600"
                        : "text-gray-500"
                    )}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PortfolioDealsMockup() {
  return (
    <div className="w-full space-y-3 select-none" aria-hidden="true">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-100/60">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Portfolio Actuals — Jun 2026
        </p>
        <div className="mb-2 grid grid-cols-4 gap-1 text-[10px] text-gray-400">
          <span>Property</span>
          <span className="text-right">Projected</span>
          <span className="text-right">Actual</span>
          <span className="text-right">Δ</span>
        </div>
        <div className="space-y-1.5">
          {(
            [
              { name: "456 Elm Ave", proj: "$2,400", actual: "$2,450", delta: "+$50", pos: true },
              { name: "123 Oak St", proj: "$2,200", actual: "$2,100", delta: "−$100", pos: false },
            ] as const
          ).map(({ name, proj, actual, delta, pos }) => (
            <div key={name} className="grid grid-cols-4 gap-1 text-xs">
              <span className="truncate text-gray-600">{name}</span>
              <span className="text-right font-mono text-gray-400">{proj}</span>
              <span className="text-right font-mono font-medium text-gray-800">{actual}</span>
              <span
                className={cn(
                  "text-right font-mono font-bold",
                  pos ? "text-emerald-600" : "text-red-500"
                )}
              >
                {delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 shadow-sm">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
            A
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
            New deal match · Phoenix, AZ
          </span>
        </div>
        <p className="font-mono text-xs font-medium text-gray-800">
          287 Maple Dr · $298k · $2,200/mo
        </p>
        <p className="mt-0.5 font-mono text-xs font-bold text-emerald-600">
          8.4% CoC · 5.9% cap rate
        </p>
      </div>
    </div>
  );
}

// ─── Step data ────────────────────────────────────────────────────────────────

type Tier = "Free" | "Pro" | "Max";

interface StepData {
  number: string;
  title: string;
  description: string;
  tier: Tier;
  badgeClass: string;
  Mockup: () => React.JSX.Element;
  reverse: boolean;
}

const STEPS: StepData[] = [
  {
    number: "1",
    title: "Analyze any property in 30 seconds",
    description:
      "Enter price, rent, and a few expense estimates. See monthly cash flow, cap rate, DSCR, and a deal score instantly — no spreadsheet, no guesswork.",
    tier: "Free",
    badgeClass: "bg-gray-100 text-gray-600",
    Mockup: CalculatorMockup,
    reverse: false,
  },
  {
    number: "2",
    title: "Save deals and pick the winner",
    description:
      "Save your best analyses to a dashboard. Select up to 4 properties to compare side-by-side. Winner highlighting tells you exactly which deal wins on every metric — cash flow, CoC return, cap rate, and more.",
    tier: "Pro",
    badgeClass: "bg-indigo-100 text-indigo-700",
    Mockup: ComparisonMockup,
    reverse: true,
  },
  {
    number: "3",
    title: "Track your portfolio and get daily deal alerts",
    description:
      "Log actual rent and expenses each month to see projected vs. real performance. Set your criteria once — get A/B-grade deals matching your filters emailed every morning at 7am.",
    tier: "Max",
    badgeClass: "bg-violet-100 text-violet-700",
    Mockup: PortfolioDealsMockup,
    reverse: false,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "This is an amazing product with an accurate calculator. Exactly what I needed for analyzing deals.",
    name: "Paul",
    initial: "P",
    avatarClass: "bg-orange-100 text-orange-700",
  },
  {
    quote:
      "Using this for the first time and it feels really good. The interface is intuitive and the numbers are clear.",
    name: "David",
    initial: "D",
    avatarClass: "bg-indigo-100 text-indigo-700",
  },
];

export default function ProductWalkthrough() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            From any listing to a confident decision
          </h2>
          <p className="mt-3 text-gray-500">
            Three steps. No spreadsheet. No guesswork.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {STEPS.map(({ number, title, description, tier, badgeClass, Mockup, reverse }) => (
            <div
              key={number}
              className={cn(
                "flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16",
                reverse && "lg:flex-row-reverse"
              )}
            >
              {/* Text */}
              <div className="flex-1 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-sm">
                    {number}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      badgeClass
                    )}
                  >
                    {tier}
                  </span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  {title}
                </h3>
                <p className="text-base leading-relaxed text-gray-500">{description}</p>
              </div>

              {/* Mockup */}
              <div className="flex-1">
                <Mockup />
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-24 grid gap-5 sm:grid-cols-2">
          {TESTIMONIALS.map(({ quote, name, initial, avatarClass }) => (
            <figure
              key={name}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <blockquote>
                <p className="text-sm leading-relaxed text-gray-600">
                  &ldquo;{quote}&rdquo;
                </p>
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    avatarClass
                  )}
                  aria-hidden="true"
                >
                  {initial}
                </span>
                <span className="text-sm font-semibold text-gray-900">{name}</span>
                <span className="text-xs text-gray-400">RentIQ user</span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/how-it-works"
            className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 hover:shadow-md"
          >
            Learn how it works
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
