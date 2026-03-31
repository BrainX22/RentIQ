"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calculator,
  GitCompareArrows,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const BASE_NAV_LINKS = [
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/how-it-works", label: "How it works", icon: BookOpen },
];

const COMPARE_LINK = { href: "/compare", label: "Compare", icon: GitCompareArrows };
const SETTINGS_LINK = { href: "/settings", label: "Settings", icon: Settings };

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  // Show Compare + Settings links only to authenticated users
  const navLinks = user ? [...BASE_NAV_LINKS, COMPARE_LINK, SETTINGS_LINK] : BASE_NAV_LINKS;
  const [mobileOpen, setMobileOpen] = useState(false);

  const getDisplayName = (): string => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    if (metadata?.display_name && typeof metadata.display_name === "string") {
      return metadata.display_name;
    }
    const email = user?.email ?? "";
    const localPart = email.split("@")[0] ?? "";
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Logged out.");
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image src="/logo.png" alt="RentIQ logo" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            RentIQ
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth controls + mobile hamburger */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading
            </span>
          ) : user ? (
            <>
              <span className="hidden rounded-md border border-orange-100 bg-orange-50 px-3 py-1.5 text-sm text-orange-600 sm:inline-block">
                Welcome, {getDisplayName()}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="hidden items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:flex"
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </Link>
          )}

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 sm:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Image src="/logo.png" alt="RentIQ logo" width={24} height={24} className="rounded" />
                  RentIQ
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname === href
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 border-t border-gray-200 pt-4">
                {isLoading ? (
                  <span className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : user ? (
                  <>
                    <p className="truncate px-3 py-1 text-sm text-gray-500">
                      Welcome, {getDisplayName()}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        void handleLogout();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
