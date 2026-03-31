import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | RentIQ — Rental Property Calculator",
    default: "RentIQ — Smarter Rental Property Analysis",
  },
  description:
    "Calculate cash flow, cap rate, and cash-on-cash return for any rental property. Free for real estate investors. Used by 100+ investors.",
  openGraph: {
    type: "website",
    siteName: "RentIQ",
    title: "RentIQ — Smarter Rental Property Analysis",
    description:
      "Calculate cash flow, cap rate, and cash-on-cash return for any rental property. Free for real estate investors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RentIQ — Smarter Rental Property Analysis",
    description:
      "Calculate cash flow, cap rate, and cash-on-cash return for any rental property. Free for real estate investors.",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
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
          <main className="min-h-[calc(100vh-4rem-5rem)]">{children}</main>
          <Footer />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
