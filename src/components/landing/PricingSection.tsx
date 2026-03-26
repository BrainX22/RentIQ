"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";

const FREE_FEATURES = [
  "5 calculations per month",
  "All metrics: cash flow, CoC, cap rate, NOI",
  "Break-even rent analysis",
  "Expense breakdown",
];

const PRO_FEATURES = [
  "Unlimited calculations",
  "Save unlimited properties",
  "Portfolio dashboard",
  "Property comparison view",
  "Deal scoring (A/B/C/D)",
  "Watchlist criteria",
  "Priority support",
];

const MAX_FEATURES = [
  "Everything in Pro",
  "Portfolio tracking (actual vs projected)",
  "Rental market comps (HUD data)",
  "Neighborhood safety & school scoring",
  "Daily deal finder + email alerts",
  "Priority support",
];

export default function PricingSection() {
  const { user } = useUser();
  const router = useRouter();
  const [isProLoading, setIsProLoading] = useState(false);
  const [isMaxLoading, setIsMaxLoading] = useState(false);
  const [proError, setProError] = useState<string | null>(null);
  const [maxError, setMaxError] = useState<string | null>(null);

  async function handleUpgrade(tier: "pro" | "max") {
    if (!user) {
      router.push("/auth/signup");
      return;
    }

    const setLoading = tier === "max" ? setIsMaxLoading : setIsProLoading;
    const setError = tier === "max" ? setMaxError : setProError;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.status === 409) {
        router.push("/dashboard");
        return;
      }

      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-gray-500">Start free. Upgrade when you&apos;re ready.</p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Free tier */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Free</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-mono text-4xl font-bold text-gray-900">$0</span>
              <span className="mb-1 text-gray-500">/mo</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Perfect for exploring your first deal.</p>

            <ul className="mt-6 flex-1 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/calculator"
              className="mt-8 block rounded-lg border border-orange-200 bg-orange-50 py-2.5 text-center text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100"
            >
              Get started free
            </Link>
          </div>

          {/* Pro tier */}
          <div className="flex flex-col rounded-xl border border-indigo-200 bg-white p-7 shadow-sm ring-1 ring-indigo-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Pro</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-mono text-4xl font-bold text-gray-900">$9</span>
              <span className="mb-1 text-gray-500">/mo</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">For serious investors building a portfolio.</p>

            <ul className="mt-6 flex-1 space-y-3">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  {feature}
                </li>
              ))}
            </ul>

            {proError && (
              <p className="mt-2 text-sm text-red-600">{proError}</p>
            )}
            <button
              onClick={() => void handleUpgrade("pro")}
              disabled={isProLoading}
              className="mt-8 flex w-full items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-70"
            >
              {isProLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Get started with Pro"
              )}
            </button>
          </div>

          {/* Max tier */}
          <div className="flex flex-col rounded-xl border border-violet-200 bg-white p-7 shadow-sm ring-1 ring-violet-100">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">Max</p>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                Most powerful
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-mono text-4xl font-bold text-gray-900">$19</span>
              <span className="mb-1 text-gray-500">/mo</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">For investors who want data-driven edge.</p>

            <ul className="mt-6 flex-1 space-y-3">
              {MAX_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  {feature}
                </li>
              ))}
            </ul>

            {maxError && (
              <p className="mt-2 text-sm text-red-600">{maxError}</p>
            )}
            <button
              onClick={() => void handleUpgrade("max")}
              disabled={isMaxLoading}
              className="mt-8 flex w-full items-center justify-center rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-70"
            >
              {isMaxLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Get started with Max"
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
