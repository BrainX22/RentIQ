import Link from "next/link";
import { FolderSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-orange-200 bg-orange-50">
        <FolderSearch className="h-8 w-8 text-orange-500" />
      </div>

      <h2 className="mt-5 text-2xl font-semibold text-gray-900">No properties saved yet</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
        Start with your first rental analysis and save it to build your portfolio dashboard.
      </p>

      <div className="mt-6">
        <Link
          href="/calculator"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "bg-orange-500 text-white hover:bg-orange-600"
          )}
        >
          Analyze Your First Property
        </Link>
      </div>
    </div>
  );
}
