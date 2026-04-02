import Link from "next/link";
import Image from "next/image";
import NeighborhoodIllustration from "@/components/landing/NeighborhoodIllustration";

const PRODUCT_LINKS = [
  { href: "/calculator",    label: "Calculator"    },
  { href: "/dashboard",     label: "Dashboard"     },
  { href: "/#pricing",      label: "Pricing"       },
  { href: "/compare",       label: "Compare"       },
  { href: "/#how-it-works", label: "How It Works"  },
];

const LEGAL_LINKS = [
  { href: "/privacy",   label: "Privacy Policy"   },
  { href: "/terms",     label: "Terms of Service" },
  { href: "/changelog", label: "Changelog"        },
];

const COMPANY_LINKS = [
  { href: "/#faq",      label: "FAQ"      },
  { href: "/#feedback", label: "Feedback" },
];

export default function Footer() {
  return (
    <footer className="mt-auto">
      {/* ── Illustrated scene ─────────────────────────────────────── */}
      <NeighborhoodIllustration />

      {/* ── Dark footer body ──────────────────────────────────────── */}
      <div className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Three columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
            {/* Brand blurb col */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="RentIQ logo"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
                <span className="text-base font-semibold text-white">RentIQ</span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-xs">
                Free rental property calculator for real estate investors.
                Analyse cash flow, cap rate, and returns in 30 seconds.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                Product
              </h3>
              <ul className="space-y-3">
                {PRODUCT_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-300 transition-colors hover:text-orange-400"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                Legal
              </h3>
              <ul className="space-y-3">
                {LEGAL_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-300 transition-colors hover:text-orange-400"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                Company
              </h3>
              <ul className="space-y-3">
                {COMPANY_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-300 transition-colors hover:text-orange-400"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-800 pt-6 sm:flex-row">
            <p className="text-xs text-slate-500">
              © 2026 RentIQ · All rights reserved.
            </p>
            <p className="text-xs text-slate-600">
              Not financial advice. For informational purposes only.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
