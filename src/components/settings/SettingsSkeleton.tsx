import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

export default function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
      {/* Header: "Welcome, Name" + badge */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-56" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-14 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Profile section */}
      <CardSkeleton>
        <Skeleton className="mb-4 h-3 w-16" />
        <div className="space-y-4">
          {/* Display name input + save */}
          <div>
            <Skeleton className="mb-1.5 h-3.5 w-24" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-16 rounded-md" />
            </div>
          </div>
          {/* Email */}
          <div>
            <Skeleton className="mb-1 h-3.5 w-10" />
            <Skeleton className="h-4 w-44" />
          </div>
          {/* Member since */}
          <div>
            <Skeleton className="mb-1 h-3.5 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardSkeleton>

      {/* Subscription section */}
      <CardSkeleton>
        <Skeleton className="mb-4 h-3 w-24" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
          <div className="pt-2">
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
      </CardSkeleton>

      {/* Properties preview */}
      <CardSkeleton>
        <Skeleton className="mb-4 h-3 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardSkeleton>

      {/* Security section */}
      <CardSkeleton>
        <Skeleton className="mb-4 h-3 w-16" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </CardSkeleton>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <Skeleton className="mb-4 h-3 w-24" />
        <Skeleton className="mb-3 h-4 w-72" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}
