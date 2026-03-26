import {
  Calculator,
  BarChart3,
  MapPin,
  BellRing,
  GitCompareArrows,
  FileSpreadsheet,
} from "lucide-react";

const FEATURES = [
  {
    icon: Calculator,
    title: "Instant Calculator",
    description:
      "Enter any property's numbers and get cash flow, CoC return, cap rate, NOI, and break-even rent in real time — no lag.",
    badge: "Free",
    badgeColor: "bg-gray-100 text-gray-600",
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
  },
  {
    icon: BarChart3,
    title: "Deal Scoring",
    description:
      "Every property gets an A/B/C/D deal score based on cash flow, cap rate, and return metrics so you can rank opportunities at a glance.",
    badge: "Free",
    badgeColor: "bg-gray-100 text-gray-600",
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
  },
  {
    icon: GitCompareArrows,
    title: "Side-by-Side Comparison",
    description:
      "Compare up to 4 properties at once. Winner highlighting shows which deal wins on every metric — no more mental math.",
    badge: "Pro",
    badgeColor: "bg-indigo-100 text-indigo-700",
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
  },
  {
    icon: FileSpreadsheet,
    title: "Portfolio Tracking",
    description:
      "Log actual monthly rent and expenses. See projected vs. actual performance and spot underperforming properties before they hurt your returns.",
    badge: "Max",
    badgeColor: "bg-violet-100 text-violet-700",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
  },
  {
    icon: MapPin,
    title: "Neighborhood Intelligence",
    description:
      "Get safety scores, income data, and home-price growth for any ZIP code — from CrimeGrade, US Census, and FHFA data.",
    badge: "Max",
    badgeColor: "bg-violet-100 text-violet-700",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
  },
  {
    icon: BellRing,
    title: "Daily Deal Alerts",
    description:
      "Set your criteria once. Get A/B-grade deals matching your filters emailed every morning at 7am — while others are still searching.",
    badge: "Max",
    badgeColor: "bg-violet-100 text-violet-700",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
  },
];

export default function FeatureHighlights() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to invest smarter
          </h2>
          <p className="mt-3 text-gray-500">
            From quick calculations to full portfolio intelligence — built for real investors.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, badge, badgeColor, iconColor, iconBg }) => (
            <div
              key={title}
              className="group relative flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Icon + badge row */}
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
                >
                  {badge}
                </span>
              </div>

              {/* Text */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
