import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="RentIQ logo" width={24} height={24} className="rounded" />
            <span className="text-sm font-semibold text-gray-900">RentIQ</span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/calculator" className="hover:text-gray-600 transition-colors">
              Calculator
            </Link>
            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/#pricing" className="hover:text-gray-600 transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400">
            Not financial advice. For informational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
