import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import ProductWalkthrough from "@/components/landing/ProductWalkthrough";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FeedbackSection from "@/components/landing/FeedbackSection";

export const metadata: Metadata = {
  title: "Free Rental Property Calculator — Cash Flow, Cap Rate & CoC Return | RentIQ",
  description:
    "Analyze any rental property in 30 seconds. Calculate cash flow, cap rate, cash-on-cash return, and deal score for free. Used by 100+ real estate investors.",
  openGraph: {
    title: "Free Rental Property Calculator — RentIQ",
    description:
      "Instantly calculate cash flow, cap rate, and cash-on-cash return for any rental property. Free to start.",
    url: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RentIQ",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Free rental property calculator for real estate investors. Calculate cash flow, cap rate, and cash-on-cash return instantly.",
  url: "https://tryrentiq.com",
  screenshot: "https://tryrentiq.com/opengraph-image",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div>
        <Hero />
        <SocialProof />
        <ProductWalkthrough />
        <PricingSection />
        <FAQSection />
        <FeedbackSection />
      </div>
      <Footer />
    </>
  );
}
