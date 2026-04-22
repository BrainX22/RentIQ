import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tryrentiq.com"),
  title: {
    template: "%s | RentIQ",
    default: "RentIQ — Free Rental Property Calculator",
  },
  description:
    "Calculate cash flow, cap rate, and cash-on-cash return for any rental property. Free for real estate investors. Used by 100+ investors.",
  openGraph: {
    type: "website",
    siteName: "RentIQ",
    title: "RentIQ — Free Rental Property Calculator",
    description:
      "Calculate cash flow, cap rate, and cash-on-cash return for any rental property. Free for real estate investors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RentIQ — Free Rental Property Calculator",
    description:
      "Calculate cash flow, cap rate, and cash-on-cash return for any rental property. Free for real estate investors.",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  // Replace with actual code from Google Search Console after deploying
  // verification: { google: "REPLACE_WITH_GSC_VERIFICATION_CODE" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <TooltipProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
        {/* Plausible Analytics — privacy-friendly, no cookie banner needed */}
        <Script
          defer
          data-domain="tryrentiq.com"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
