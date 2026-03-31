"use client";

import { Button } from "@/components/ui/button";
import { encodeInputs } from "@/lib/share-link";
import type { CalculatorInputs } from "@/types";
import { Link2, Printer } from "lucide-react";
import { toast } from "sonner";

interface Props {
  inputs: CalculatorInputs;
}

export default function ShareExportBar({ inputs }: Props) {
  const handleShareLink = async () => {
    const encoded = encodeInputs(inputs);
    const url = `${window.location.origin}/calculator?data=${encodeURIComponent(encoded)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link — try HTTPS.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShareLink}
        className="cursor-pointer gap-1.5 transition-colors duration-200"
      >
        <Link2 className="h-3.5 w-3.5" />
        Share Link
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="cursor-pointer gap-1.5 transition-colors duration-200"
      >
        <Printer className="h-3.5 w-3.5" />
        Print Report
      </Button>
    </div>
  );
}
