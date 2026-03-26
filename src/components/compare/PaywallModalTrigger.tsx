"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import PaywallModal from "@/components/PaywallModal";

/**
 * Thin client boundary used in the compare page's Pro upsell section.
 * Keeps the parent page a Server Component while allowing the modal to open.
 */
export default function PaywallModalTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="mt-6 bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500"
        onClick={() => setOpen(true)}
      >
        Upgrade to Pro — $9/mo
      </Button>
      <PaywallModal open={open} onOpenChange={setOpen} />
    </>
  );
}
