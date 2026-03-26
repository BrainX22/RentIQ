"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MonthlyActual } from "@/types";

interface LogActualsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  /** Called after a successful POST — parent uses this to refresh the actuals view */
  onSuccess: () => void;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface ActualsPayload {
  error?: string;
  actual?: MonthlyActual;
}

export default function LogActualsModal({
  open,
  onOpenChange,
  propertyId,
  onSuccess,
}: LogActualsModalProps) {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [actualRent, setActualRent] = useState("");
  const [actualExpenses, setActualExpenses] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      const d = new Date();
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
      setActualRent("");
      setActualExpenses("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rentValue = parseFloat(actualRent);
    if (isNaN(rentValue) || rentValue < 0) {
      setError("Actual rent must be a non-negative number.");
      return;
    }

    const expensesValue = parseFloat(actualExpenses);
    if (isNaN(expensesValue) || expensesValue < 0) {
      setError("Actual expenses must be a non-negative number.");
      return;
    }

    const yearMax = new Date().getFullYear() + 10;
    if (year < 2020 || year > yearMax) {
      setError(`Year must be between 2020 and ${yearMax}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/actuals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          actual_rent: rentValue,
          actual_expenses: expensesValue,
          notes: notes.trim() || null,
        }),
      });
      const payload = (await res.json()) as ActualsPayload;

      if (res.status === 201) {
        toast.success("Actuals logged successfully.");
        onSuccess();
        onOpenChange(false);
        return;
      }

      if (res.status === 409) {
        setError("Actuals for this month and year already exist.");
        return;
      }

      setError(payload.error ?? "Failed to save actuals. Please try again.");
    } catch {
      setError("Failed to save actuals. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Monthly Actuals</DialogTitle>
          <DialogDescription>
            Track actual rent collected and expenses paid for this property.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-actuals-month" className="text-sm font-medium text-gray-700">
                Month
              </Label>
              <select
                id="log-actuals-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {MONTHS.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log-actuals-year" className="text-sm font-medium text-gray-700">
                Year
              </Label>
              <Input
                id="log-actuals-year"
                type="number"
                min={2020}
                max={new Date().getFullYear() + 10}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-actuals-rent" className="text-sm font-medium text-gray-700">
                Actual Rent ($)
              </Label>
              <Input
                id="log-actuals-rent"
                type="number"
                min={0}
                step="0.01"
                value={actualRent}
                onChange={(e) => setActualRent(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log-actuals-expenses" className="text-sm font-medium text-gray-700">
                Actual Expenses ($)
              </Label>
              <Input
                id="log-actuals-expenses"
                type="number"
                min={0}
                step="0.01"
                value={actualExpenses}
                onChange={(e) => setActualExpenses(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log-actuals-notes" className="text-sm font-medium text-gray-700">
                Notes
              </Label>
              <textarea
                id="log-actuals-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Optional notes..."
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            <Button
              type="submit"
              className="bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Actuals"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
