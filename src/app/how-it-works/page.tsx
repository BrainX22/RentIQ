// rpc/src/app/how-it-works/page.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HowItWorksSidebar } from "@/components/how-it-works/HowItWorksSidebar";

// ─── Shared primitives ────────────────────────────────────────────────────────

type Tier = "Free" | "Pro" | "Max";

function TierBadge({ tier }: { tier: Tier }) {
  const colors: Record<Tier, string> = {
    Free: "bg-gray-100 text-gray-600",
    Pro: "bg-indigo-100 text-indigo-700",
    Max: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        colors[tier]
      )}
    >
      {tier}
    </span>
  );
}

function SectionHeading({
  title,
  tier,
}: {
  title: string;
  tier: Tier;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-5">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {title}
      </h2>
      <TierBadge tier={tier} />
    </div>
  );
}

function MetricTable({
  rows,
}: {
  rows: { metric: string; formula?: string; meaning: string; target?: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Metric</th>
            {rows.some((r) => r.formula) && (
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Formula
              </th>
            )}
            <th className="px-4 py-3 text-left font-semibold text-gray-700">What it means</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Target</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ metric, formula, meaning, target }) => (
            <tr key={metric} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                {metric}
              </td>
              {rows.some((r) => r.formula) && (
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {formula ?? "—"}
                </td>
              )}
              <td className="px-4 py-3 text-gray-600">{meaning}</td>
              <td className="px-4 py-3 text-sm">
                {target ? (
                  <span className="font-semibold text-emerald-700">{target}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InputTable({
  rows,
}: {
  rows: { input: string; typical: string; note: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Input</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Typical value
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ input, typical, note }) => (
            <tr key={input} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                {input}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{typical}</td>
              <td className="px-4 py-3 text-gray-600">{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  children,
  color = "orange",
}: {
  children: React.ReactNode;
  color?: "orange" | "indigo" | "violet" | "emerald";
}) {
  const styles = {
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={cn("rounded-xl border p-4 text-sm leading-relaxed", styles[color])}>
      {children}
    </div>
  );
}

// ─── Section content ──────────────────────────────────────────────────────────

function CalculatorSection() {
  return (
    <section id="calculator" className="scroll-mt-24">
      <SectionHeading title="The Calculator" tier="Free" />

      <div className="space-y-8">
        <p className="text-base leading-relaxed text-gray-600">
          The calculator is RentIQ&apos;s core tool. Enter the numbers for any
          rental property and get a complete financial picture in real time — no
          spreadsheet, no formulas to remember. Every metric updates instantly as
          you type.
        </p>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Inputs</h3>
          <InputTable
            rows={[
              {
                input: "Property Price",
                typical: "—",
                note: "The asking or purchase price. Start here.",
              },
              {
                input: "Down Payment %",
                typical: "20–25%",
                note: "Investment loans typically require 20–25%. Higher down = lower mortgage but more cash invested.",
              },
              {
                input: "Interest Rate",
                typical: "Current 30yr fixed",
                note: "Use today's 30-year fixed rate. Check Bankrate or Freddie Mac's weekly survey.",
              },
              {
                input: "Monthly Rent",
                typical: "—",
                note: "Gross rent you plan to charge. Use Rental Comps (Max) or check Zillow/Apartments.com for market rates.",
              },
              {
                input: "Property Tax (yearly)",
                typical: "1–1.5% of price/yr",
                note: "Look up the exact figure on the county assessor site. Never estimate this one.",
              },
              {
                input: "Insurance (monthly)",
                typical: "$100–150/mo",
                note: "Landlord policy — NOT a homeowner's policy. Get an actual quote. Budgeting $1,200–1,800/yr is reasonable.",
              },
              {
                input: "Maintenance %",
                typical: "8–12% of rent",
                note: "Set aside this % of monthly rent for repairs. Use 10% for a standard property, 12–15% for older or distressed.",
              },
              {
                input: "Vacancy %",
                typical: "5–10% of rent",
                note: "5% ≈ 18 days empty per year. Use 8–10% in slower markets or if you're new to a market.",
              },
              {
                input: "Property Management %",
                typical: "0 (self-manage) or 8–12%",
                note: "If you're using a property manager: 8–12% of rent is standard. Set to 0 if managing yourself.",
              },
              {
                input: "Closing Costs %",
                typical: "2–5% of price",
                note: "Title, escrow, lender origination fees. Affects Total Cash Invested and True CoC — not the monthly cash flow.",
              },
              {
                input: "HOA Monthly",
                typical: "$0 if N/A",
                note: "Monthly HOA fee if applicable. Counts as a fixed monthly expense.",
              },
            ]}
          />
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Outputs</h3>
          <MetricTable
            rows={[
              {
                metric: "Monthly Cash Flow",
                formula: "Rent − all monthly expenses",
                meaning:
                  "Net income after every cost including mortgage. Positive = money in your pocket each month.",
                target: "Any positive number",
              },
              {
                metric: "Annual Cash Flow",
                formula: "Monthly CF × 12",
                meaning: "Full-year net income from the property.",
                target: "—",
              },
              {
                metric: "Cash-on-Cash Return",
                formula: "Annual CF ÷ Down Payment",
                meaning:
                  "What % of your cash investment you earn per year. Simple and widely used, but ignores closing costs.",
                target: "8%+ excellent",
              },
              {
                metric: "Cap Rate",
                formula: "NOI ÷ Purchase Price",
                meaning:
                  "Financing-independent yield. Lets you compare properties regardless of how they're financed. Lenders and appraisers use this.",
                target: "5%+ solid",
              },
              {
                metric: "NOI",
                formula: "Annual rent − annual operating expenses (excl. mortgage)",
                meaning:
                  "Net Operating Income. Your property's income before debt service. Used by lenders to qualify loans.",
                target: "—",
              },
              {
                metric: "Break-Even Rent",
                formula: "Total monthly expenses (incl. mortgage)",
                meaning:
                  "The minimum rent needed to avoid losing money. Should be comfortably below your actual rent.",
                target: "Below actual rent",
              },
              {
                metric: "DSCR",
                formula: "NOI ÷ Annual Debt Service",
                meaning:
                  "Debt Service Coverage Ratio. Lenders check this when qualifying investment loans. ≥1.25 means the property pays its own mortgage with room to spare.",
                target: "≥1.25 for lender approval",
              },
              {
                metric: "Total Cash Invested",
                formula: "Down Payment + (Closing Costs % × Price)",
                meaning:
                  "The true amount leaving your bank account at closing. More accurate than just the down payment.",
                target: "—",
              },
              {
                metric: "True Cash-on-Cash",
                formula: "Annual CF ÷ Total Cash Invested",
                meaning:
                  "A more conservative and accurate version of CoC that accounts for closing costs in the denominator.",
                target: "—",
              },
            ]}
          />
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Deal Score</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            Every analysis produces a Deal Score: A, B, C, or D. The formula is
            based on two of the most widely used thresholds in real estate
            investing.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Grade</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Criteria</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 font-mono text-base font-bold text-orange-500">A</td>
                  <td className="px-4 py-3 text-gray-600">
                    Cash-on-Cash ≥ 8% <strong>AND</strong> Cap Rate ≥ 5%
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    Strong on both return and yield. The deals deal-finders target.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-base font-bold text-emerald-600">B</td>
                  <td className="px-4 py-3 text-gray-600">
                    Cash-on-Cash ≥ 6% <strong>OR</strong> Cap Rate ≥ 4%
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    Solid fundamentals. Worth investigating further.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-base font-bold text-amber-500">C</td>
                  <td className="px-4 py-3 text-gray-600">Positive cash flow, below B thresholds</td>
                  <td className="px-4 py-3 text-gray-600">
                    Marginally profitable. May work with appreciation upside.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-base font-bold text-red-500">D</td>
                  <td className="px-4 py-3 text-gray-600">Negative cash flow</td>
                  <td className="px-4 py-3 text-gray-600">
                    Loses money at current numbers. Adjust rent or price.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Callout color="orange">
          <strong>Tip:</strong> All inputs are saved to your browser automatically.
          If you close the tab and come back, your last analysis is restored.
          Click &ldquo;Reset to defaults&rdquo; to start fresh.
        </Callout>

        <div className="pt-2">
          <Link
            href="/calculator"
            className="group inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600"
          >
            Open the Calculator
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SaveCompareSection() {
  return (
    <section id="save-compare" className="scroll-mt-24">
      <SectionHeading title="Save & Compare" tier="Pro" />

      <div className="space-y-8">
        <p className="text-base leading-relaxed text-gray-600">
          The Pro tier unlocks unlimited saves and the comparison view. Once
          you&apos;ve found a property that looks promising in the calculator,
          save it to your dashboard with one click. Then compare your saved
          properties side-by-side to make a clear, defensible decision.
        </p>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Saving an analysis</h3>
          <p className="text-sm leading-relaxed text-gray-600">
            After running a calculation, click <strong>Save Analysis</strong> on the
            calculator page. Enter the property address or a nickname. The full
            analysis — all inputs, all computed metrics, and the deal score — is
            stored to your account. Free-tier users can save up to 5 properties
            per month. Pro and Max users have no limit.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Dashboard</h3>
          <p className="text-sm leading-relaxed text-gray-600">
            Your dashboard shows every saved property as a card. Each card
            displays the deal score badge, monthly cash flow, CoC return, cap
            rate, and purchase price at a glance. Click any card to expand it
            and see the full analysis, or to open the property back in the
            calculator.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Comparison view</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            Select 2 to 4 properties from your dashboard using the checkbox on
            each card, then click <strong>Compare Selected</strong>. The
            comparison grid shows all 8 key metrics side-by-side:
          </p>
          <ol className="mb-4 ml-5 list-decimal space-y-1 text-sm text-gray-600">
            <li>Monthly Cash Flow</li>
            <li>Annual Cash Flow</li>
            <li>Cash-on-Cash Return</li>
            <li>Cap Rate</li>
            <li>Net Operating Income (NOI)</li>
            <li>Break-Even Rent</li>
            <li>Total Cash Invested</li>
            <li>Deal Score</li>
          </ol>
          <p className="text-sm leading-relaxed text-gray-600">
            The best value in each row is highlighted in green. The overall{" "}
            <strong>Best Deal</strong> badge is determined by a weighted score:
            Cash Flow (30%), CoC Return (25%), Cap Rate (20%), NOI (15%),
            Break-Even Rent (10%).
          </p>
        </div>

        <Callout color="indigo">
          <strong>Pro tip:</strong> Run the same property with different down
          payment percentages (15%, 20%, 25%) and save each variant. Then
          compare them to find the financing structure that optimizes your CoC
          return vs. cash invested.
        </Callout>
      </div>
    </section>
  );
}

function RentalCompsSection() {
  return (
    <section id="rental-comps" className="scroll-mt-24">
      <SectionHeading title="Rental Comps" tier="Max" />

      <div className="space-y-8">
        <p className="text-base leading-relaxed text-gray-600">
          The Rental Comps feature pulls Fair Market Rent data for any U.S.
          ZIP code, giving you a government-sourced benchmark to validate your
          rent assumptions before you run the numbers.
        </p>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Data source</h3>
          <p className="text-sm leading-relaxed text-gray-600">
            RentIQ uses official{" "}
            <strong>
              U.S. Department of Housing and Urban Development (HUD) Small Area
              Fair Market Rents (SAFMR)
            </strong>{" "}
            — government data published annually. The database is seeded
            with FY2026 data, covering <strong>193,000+ U.S. ZIP codes</strong>.
            No third-party API is involved; queries run against RentIQ&apos;s own
            database for instant, reliable results.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">What it shows</h3>
          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Enter a ZIP code and number of bedrooms (0–4+). You&apos;ll see:
          </p>
          <ul className="ml-5 list-disc space-y-2 text-sm text-gray-600">
            <li>
              <strong>Fair Market Rent (FMR):</strong> The 40th percentile rent in that market for
              that bedroom count. This means 40% of units rent{" "}
              <em>below</em> this figure.
            </li>
            <li>
              <strong>Market comparison:</strong> Whether your estimated rent is
              above or below the FMR benchmark.
            </li>
            <li>
              <strong>Above-market warning:</strong> If your estimated rent is more
              than 15% above the FMR, a caution badge appears. This
              doesn&apos;t mean your rent is wrong — renovated units or hot
              submarkets often command above-FMR rents — but it&apos;s worth
              verifying with active listings.
            </li>
          </ul>
        </div>

        <Callout color="violet">
          <strong>Data refresh:</strong> Fair Market Rent data is updated every October.
          RentIQ will update to FY2027 data in October 2026. The current data
          reflects FY2026 SAFMR rents.
        </Callout>
      </div>
    </section>
  );
}

function NeighborhoodSection() {
  return (
    <section id="neighborhood" className="scroll-mt-24">
      <SectionHeading title="Neighborhood Scoring" tier="Max" />

      <div className="space-y-8">
        <p className="text-base leading-relaxed text-gray-600">
          Neighborhood Scoring gives you a composite A–F grade for any U.S. ZIP
          code, combining three independent data sources: crime data, household
          income, and home price appreciation.
        </p>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            The three scores
          </h3>
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Safety Score</h4>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                  40% weight
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                <strong>Source:</strong> CrimeGrade.org. Measures crime rates in
                the ZIP code relative to the national average. Grades range from
                A+ (safest 5% nationally) to F (most dangerous 10%). Translated
                to a 0–100 score for the composite: A+ → 95, A → 85, B → 70,
                C → 50, D → 30, F → 10.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Income Score</h4>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                  35% weight
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                <strong>Source:</strong> U.S. Census Bureau American Community
                Survey (ACS5 5-year estimates). Measures median household income
                for the ZIP code. Scaled: $30k → 0, $100k+ → 100. Higher income
                areas generally have more stable tenant pools, lower vacancy, and
                stronger rental demand.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Growth Score</h4>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                  25% weight
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                <strong>Source:</strong> Federal Housing Finance Agency (FHFA)
                House Price Index. Measures annual home price appreciation for
                the 3-digit ZIP prefix area. Scaled: 0% growth → 0, 6%+ annual
                growth → 100. Equity appreciation is a major component of
                long-term rental property returns.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Composite grade
          </h3>
          <MetricTable
            rows={[
              {
                metric: "A (80–100)",
                meaning:
                  "Strong across safety, income, and growth. Prime investment territory.",
                target: "—",
              },
              {
                metric: "B (60–79)",
                meaning:
                  "Above-average on most dimensions. Good fundamentals for long-term holds.",
                target: "—",
              },
              {
                metric: "C (40–59)",
                meaning:
                  "Mixed signals. Acceptable but requires thorough due diligence.",
                target: "—",
              },
              {
                metric: "D (20–39)",
                meaning: "Weak fundamentals. High risk. Consider alternatives.",
                target: "—",
              },
              {
                metric: "F (0–19)",
                meaning: "Avoid. Very high crime, low income, or negative growth.",
                target: "—",
              },
            ]}
          />
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Vacancy advisory
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            If the safety score is below 60/100 (roughly a D or F CrimeGrade),
            RentIQ surfaces a vacancy advisory suggesting you increase your
            vacancy rate by +3%. Areas with crime concerns typically see higher
            tenant turnover. You can click <strong>Apply Suggestion</strong> to
            update your calculator inputs automatically.
          </p>
        </div>
      </div>
    </section>
  );
}

function PortfolioSection() {
  return (
    <section id="portfolio" className="scroll-mt-24">
      <SectionHeading title="Portfolio Tracking" tier="Max" />

      <div className="space-y-8">
        <p className="text-base leading-relaxed text-gray-600">
          After saving a property, you can log its actual monthly performance.
          Portfolio Tracking turns RentIQ from a deal-analysis tool into an
          ongoing management layer — letting you see whether your investments
          are performing as you modeled.
        </p>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Logging actuals
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            Open any saved property and click <strong>Log Monthly Actuals</strong>.
            Enter the actual rent collected and total expenses for that month.
            Log entries are stored permanently and cannot be overwritten — each
            month/year combination is unique.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Projected vs. actual
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            For each logged month, RentIQ compares your actuals against the
            projected values from your original saved analysis:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-1.5 text-sm text-gray-600">
            <li>Actual rent vs. projected rent</li>
            <li>Actual expenses vs. projected expenses</li>
            <li>Actual cash flow vs. projected cash flow</li>
            <li>Cash flow variance (+ or −)</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Underperforming detection
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            If a property&apos;s actual cash flow falls below{" "}
            <strong>80% of projected for 2 or more consecutive months</strong>,
            it is flagged as underperforming in your dashboard. This is an early
            warning to investigate: the cause may be a rent reduction, an
            unexpected repair expense, extended vacancy, or a combination. Catching
            this early lets you adjust before it compounds.
          </p>
        </div>

        <Callout color="violet">
          <strong>Portfolio summary:</strong> The dashboard header shows aggregate
          totals across all your Max-tier properties: total projected monthly cash
          flow, total estimated portfolio value, and average cash-on-cash return.
        </Callout>
      </div>
    </section>
  );
}

function DealFinderSection() {
  return (
    <section id="deal-finder" className="scroll-mt-24">
      <SectionHeading title="Deal Finder" tier="Max" />

      <div className="space-y-8">
        <p className="text-base leading-relaxed text-gray-600">
          Deal Finder monitors properties for you based on your criteria and
          emails you A/B-grade matches every morning. Set it up once — it runs
          daily at 7am UTC without any action from you.
        </p>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Setting your criteria
          </h3>
          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Go to <strong>Dashboard → Deal Alerts</strong> and set:
          </p>
          <ul className="ml-5 list-disc space-y-1.5 text-sm text-gray-600">
            <li>
              <strong>Target city:</strong> e.g., &ldquo;Austin, TX&rdquo;
            </li>
            <li>
              <strong>Maximum purchase price:</strong> Your budget ceiling
            </li>
            <li>
              <strong>Minimum cash-on-cash return:</strong> Your floor threshold
            </li>
            <li>
              <strong>Daily email digest:</strong> Toggle on to receive email
              matches every morning
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            How deals are scored
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            Every day at 7am UTC, RentIQ scores properties in the database
            against all active watchlists. Only properties scoring{" "}
            <strong>Grade A or Grade B</strong> are surfaced — the same deal
            scoring formula used in the calculator (A = CoC ≥8% and Cap
            Rate ≥5%, B = CoC ≥6% or Cap Rate ≥4%). Marginal C/D-grade
            properties are excluded. Matches are filtered by your city, max
            price, and min return criteria before landing in your feed.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Email digest
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            The daily email arrives at approximately 7am UTC (2–3am Eastern,
            11pm–12am Pacific). Each deal in the digest shows:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-1.5 text-sm text-gray-600">
            <li>Property address and city</li>
            <li>Purchase price</li>
            <li>Estimated monthly rent</li>
            <li>Estimated cash-on-cash return</li>
            <li>Deal grade (A or B)</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Click any deal in the email to open it pre-loaded in the RentIQ
            calculator for a full analysis.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Dismissing matches
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            In the app&apos;s <strong>Deal Alerts</strong> feed, click{" "}
            <strong>Not interested</strong> on any match you&apos;ve already
            reviewed or don&apos;t want to see again. Dismissed deals are
            permanently removed from your feed and will not appear in future
            emails.
          </p>
        </div>

        <Callout color="violet">
          <strong>Heads up:</strong> Deal Finder uses RentIQ&apos;s internal
          property database, not a live MLS feed. Matches are based on the
          properties available in the database for your target city. If
          you&apos;re in a very small or rural market, daily matches may be
          sparse.
        </Callout>
      </div>
    </section>
  );
}

// ─── Mobile ToC ───────────────────────────────────────────────────────────────

const MOBILE_TOC = [
  { id: "calculator", label: "Calculator", tier: "Free" },
  { id: "save-compare", label: "Save & Compare", tier: "Pro" },
  { id: "rental-comps", label: "Rental Comps", tier: "Max" },
  { id: "neighborhood", label: "Neighborhood", tier: "Max" },
  { id: "portfolio", label: "Portfolio", tier: "Max" },
  { id: "deal-finder", label: "Deal Finder", tier: "Max" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <div className="bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <div className="mb-12 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            How RentIQ works
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            A complete reference for every feature — from the free calculator to
            Max tier deal alerts. Each section explains the inputs, outputs, and
            logic behind the tool.
          </p>
        </div>

        {/* Mobile ToC (hidden on lg) */}
        <div className="mb-10 lg:hidden">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Jump to
          </p>
          <div className="flex flex-wrap gap-2">
            {MOBILE_TOC.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-orange-200 hover:text-orange-700"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="lg:flex lg:gap-12">
          {/* Sticky sidebar — desktop only */}
          <aside className="hidden lg:block lg:w-56 lg:shrink-0">
            <div className="sticky top-24">
              <HowItWorksSidebar />
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            <div className="space-y-20 divide-y divide-gray-100">
              <CalculatorSection />
              <div className="pt-16">
                <SaveCompareSection />
              </div>
              <div className="pt-16">
                <RentalCompsSection />
              </div>
              <div className="pt-16">
                <NeighborhoodSection />
              </div>
              <div className="pt-16">
                <PortfolioSection />
              </div>
              <div className="pt-16">
                <DealFinderSection />
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-20 rounded-2xl border border-orange-100 bg-orange-50 p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                Ready to analyze your first deal?
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Free to start. No credit card required.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/calculator"
                  className="group inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600"
                >
                  Open the Calculator
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Create free account
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
