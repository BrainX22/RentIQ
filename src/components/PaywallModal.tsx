"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'save_limit' (default): free save cap reached. 'max_feature': Max-only feature accessed by Pro/free user. */
  reason?: "save_limit" | "max_feature";
  /** Name of the Max feature being accessed, e.g. "Portfolio Tracking". */
  featureName?: string;
}

export default function PaywallModal({
  open,
  onOpenChange,
  reason = "save_limit",
  featureName,
}: PaywallModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMaxUpsell = reason === "max_feature";
  const tier = isMaxUpsell ? "max" : "pro";

  async function handleUpgrade() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.status === 409) {
        onOpenChange(false);
        router.refresh();
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
      setIsLoading(false);
    }
  }

  const title = isMaxUpsell
    ? `${featureName ?? "This feature"} requires Max`
    : "You've used all 5 free saves this month";

  const description = isMaxUpsell
    ? `Upgrade to Max for Portfolio Tracking, Rental Comps, Neighborhood Scoring, and Deal Finder + Email Alerts.`
    : "Upgrade to Pro for unlimited property saves and advanced deal workflow tools.";

  const buttonLabel = isMaxUpsell ? "Upgrade to Max — $19/mo" : "Upgrade to Pro — $9/mo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex gap-2">
          <Button
            className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              buttonLabel
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
