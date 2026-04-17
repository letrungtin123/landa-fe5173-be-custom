import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Profile Skeleton */}
        <div className="w-full lg:w-[240px]">
          <Card className="border-border">
            <CardContent className="flex flex-col items-center p-6">
              <Skeleton className="mb-4 h-20 w-20 rounded-full" />
              <Skeleton className="mb-2 h-5 w-32" />
              <Skeleton className="mb-1 h-4 w-28" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="my-4 h-px w-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Welcome + Banner */}
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-10 w-80" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>

            {/* Right cards */}
            <div className="flex flex-col gap-4 lg:w-[200px]">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Card className="border-border">
                <CardContent className="flex flex-col items-center p-6">
                  <Skeleton className="mb-4 h-28 w-28 rounded-full" />
                  <Skeleton className="mb-1 h-4 w-20" />
                  <Skeleton className="mb-2 h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Notifications + Continue Learning */}
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Notifications */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>

            {/* Course Cards */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <Card key={i} className="border-border overflow-hidden">
                    <Skeleton className="h-40 w-full" />
                    <div className="p-4 space-y-2">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-5 w-44" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
