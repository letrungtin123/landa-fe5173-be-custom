import { Skeleton } from "@/components/ui/skeleton";

export function LessonSkeleton() {
  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Main Area — cấu trúc phải khớp với LessonDetailPage thật */}
      <div className="flex flex-1">
        <div className="flex-1 min-w-0">
          <div className="w-full px-6 py-6 md:px-7 md:py-8 2xl:px-8 2xl:py-12">
            {/* Header skeleton */}
            <div className="mb-4">
              <div className="mb-3 flex items-center gap-3">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-12 w-80 mb-2" />
            </div>

            {/* Progress bar skeleton */}
            <Skeleton className="mb-8 h-1.5 w-full rounded-full" />

            {/* Content row */}
            <div className="flex flex-col xl:flex-row gap-8 xl:gap-8">
              {/* Left Column */}
              <div className="flex-1 min-w-0 flex flex-col gap-5">
                {/* Unit text block skeleton */}
                <div className="rounded-3xl border border-border px-8 py-7 shadow-sm bg-card">
                  <Skeleton className="h-5 w-24 rounded-full mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>

                {/* Quiz block skeleton */}
                <div className="rounded-3xl border border-border px-8 py-7 shadow-sm bg-card">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                  </div>
                </div>

                {/* Nav buttons skeleton */}
                <div className="flex justify-between mt-2">
                  <Skeleton className="h-10 w-28 rounded-xl" />
                  <Skeleton className="h-10 w-28 rounded-xl" />
                </div>
              </div>

              {/* Right sidebar skeleton (xl+) */}
              <div className="hidden xl:flex w-[260px] shrink-0 flex-col gap-6">
                <div className="rounded-3xl border border-border shadow-sm bg-card p-6">
                  <Skeleton className="h-5 w-16 rounded-full mb-3" />
                  <Skeleton className="h-6 w-40 mb-4" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </div>
                  </div>
                </div>
                <Skeleton className="h-40 w-full rounded-3xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="border-t border-border py-6 text-center bg-muted/30">
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}
