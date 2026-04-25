// ============================================================
// SlideContent — Hiển thị nội dung HTML từ Open edX
// Lấy HTML qua Studio (CMS) xblock API hoặc blocks API
// ============================================================

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/api/client";
import type { LessonDetail } from "@/data/types";

interface SlideContentProps {
  lesson: LessonDetail;
}



export function SlideContent({ lesson }: SlideContentProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Ưu tiên 1: HTML từ blocks API (nếu feature flag bật)
    if (lesson._htmlContent) {
      setHtmlContent(
        DOMPurify.sanitize(lesson._htmlContent, {
          FORBID_TAGS: ["script", "style"],
          FORBID_ATTR: ["onerror", "onload", "onclick"],
        })
      );
      return;
    }

    // Ưu tiên 2: Lấy qua CMS API cho từng html block
    const htmlBlockIds = lesson._htmlBlocks;
    if (!htmlBlockIds || htmlBlockIds.length === 0) return;

    // Với block HTML đã khắc phục được lỗi 500 trên server, 
    // content gốc sẽ nằm trong lesson._htmlContent.
    setIsLoading(false);

  }, [lesson.id, lesson._htmlContent, lesson._htmlBlocks]);

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge className="bg-accent text-accent-foreground font-semibold text-xs uppercase tracking-wider px-3 py-1">
            {lesson.moduleTag}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {lesson.lessonNumber}
          </span>
        </div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          {lesson.title}
        </h1>
      </div>

      {/* Nội dung */}
      <div className="flex flex-1 items-start justify-center p-6 md:p-12">
        {isLoading && (
          <div className="w-full max-w-4xl space-y-4 py-8">
            <Skeleton className="h-6 w-3/4 mb-8" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}

        {htmlContent && !isLoading ? (
          <div
            className="prose prose-slate dark:prose-invert max-w-4xl w-full"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : !isLoading ? (
          <div className="flex w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 aspect-[16/9] p-8 text-center">
            <div className="mb-4 text-4xl">📄</div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              {lesson.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Nội dung chưa được cập nhật.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
