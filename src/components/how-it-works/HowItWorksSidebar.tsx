// rpc/src/components/how-it-works/HowItWorksSidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Tier = "Free" | "Pro" | "Max";

interface SectionLink {
  id: string;
  label: string;
  tier: Tier;
}

const SECTIONS: SectionLink[] = [
  { id: "calculator", label: "The Calculator", tier: "Free" },
  { id: "save-compare", label: "Save & Compare", tier: "Pro" },
  { id: "rental-comps", label: "Rental Comps", tier: "Max" },
  { id: "neighborhood", label: "Neighborhood Score", tier: "Max" },
  { id: "portfolio", label: "Portfolio Tracking", tier: "Max" },
  { id: "deal-finder", label: "Deal Finder", tier: "Max" },
];

const TIER_BADGE: Record<Tier, string> = {
  Free: "bg-gray-100 text-gray-600",
  Pro: "bg-indigo-100 text-indigo-700",
  Max: "bg-violet-100 text-violet-700",
};

export function HowItWorksSidebar() {
  const [activeId, setActiveId] = useState<string>("calculator");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      // Trigger when the top 20% of a section enters the viewport
      { rootMargin: "-10% 0% -75% 0%", threshold: 0 }
    );

    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Page sections">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        On this page
      </p>
      <ul className="space-y-0.5">
        {SECTIONS.map(({ id, label, tier }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                activeId === id
                  ? "bg-orange-50 font-semibold text-orange-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <span>{label}</span>
              <span
                className={cn(
                  "ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  TIER_BADGE[tier]
                )}
              >
                {tier}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
