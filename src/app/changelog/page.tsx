import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — RentIQ",
  description: "What's new in RentIQ — release history and feature updates.",
};

const RELEASES = [
  {
    version: "v1.0",
    date: "April 2026",
    label: "Initial Launch",
    features: [
      "Free rental property calculator — cash flow, cap rate, CoC return, DSCR, break-even rent, deal score (A/B/C/D)",
      "Save up to 5 properties/month on the Free tier",
      "Pro tier ($9/mo): unlimited saves, dashboard, comparison view",
      "Max tier ($19/mo): rental comps (HUD FMR data), neighborhood scoring, deal finder + daily email digest",
      "Excel and CSV import with intelligent column auto-mapping",
      "Shareable calculator links (base64-encoded URL)",
      "Print / PDF export",
      "Calculator state persists in localStorage across sessions",
      "Password visibility toggle and magic link sign-in",
      "Account deletion with immediate data removal",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Changelog</h1>
      <p className="mt-2 text-sm text-gray-500">
        All notable changes to RentIQ are documented here.
      </p>

      <div className="mt-12 space-y-12">
        {RELEASES.map((r) => (
          <div key={r.version} className="relative pl-6 border-l-2 border-orange-200">
            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-orange-500 ring-2 ring-white" />
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                {r.version}
              </span>
              <span className="text-sm font-medium text-gray-900">{r.label}</span>
              <span className="text-xs text-gray-400">{r.date}</span>
            </div>
            <ul className="space-y-1.5">
              {r.features.map((f, i) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
