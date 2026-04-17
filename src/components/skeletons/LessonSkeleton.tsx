import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function LessonSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar Skeleton */}
      <aside className="hidden w-[280px] shrink-0 border-r border-border p-5 lg:block">
        <Skeleton className="mb-2 h-6 w-48" />
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              {i === 2 && (
                <div className="ml-6 space-y-1.5">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-6 md:p-8">
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="mb-6 h-9 w-80" />

        {/* Video */}
        <Skeleton className="mb-8 aspect-video w-full rounded-xl" />

        {/* Objectives */}
        <Card className="mb-6 border-border">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        {/* Intro */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Mentor Sidebar Skeleton */}
      <aside className="hidden w-[300px] shrink-0 border-l border-border p-6 xl:block">
        <Skeleton className="mb-3 h-5 w-16" />
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-32 w-full rounded-xl" />
      </aside>
    </div>
  );
}
