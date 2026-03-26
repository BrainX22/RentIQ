import {
  ShieldCheck,
  Star,
  Users,
  TrendingUp,
} from "lucide-react";

const STATS = [
  {
    icon: Users,
    value: "100+",
    label: "Investors using RentIQ",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: TrendingUp,
    value: "$0",
    label: "Cost to get started",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Star,
    value: "30s",
    label: "To analyze any deal",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: ShieldCheck,
    value: "100%",
    label: "No spreadsheet needed",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
];

export default function SocialProof() {
  return (
    <section className="border-y border-gray-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map(({ icon: Icon, value, label, color, bg }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
              </div>
              <span className="font-mono text-2xl font-bold text-gray-900">{value}</span>
              <span className="text-xs leading-tight text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
