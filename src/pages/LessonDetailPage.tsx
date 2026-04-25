import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { LessonSkeleton } from "@/components/skeletons/LessonSkeleton";
import { QuizContent } from "@/components/lesson/QuizContent";
import { UnitNavButtons } from "@/components/lesson/UnitNavButtons";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLessonDetail } from "@/hooks/useLessonDetail";
import { useCourse, useCourseStructure } from "@/hooks/useCourses";
import { BookOpen, Download, MessageCircle, User, CheckCircle2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { useMemo, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { config } from "@/config/env";
import { parseMentorsFromOverview } from "@/transformers/overviewParser";
import { markBlocksComplete } from "@/api/progress";

// ── Badge component (declared outside render to satisfy React Compiler) ──
const BadgeCyan = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
    {children}
  </span>
);

export function LessonDetailPage() {
  const { courseId } = useParams();
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const currentUnitIndex = useAppStore((s) => s.currentUnitIndex);
  const nextUnit = useAppStore((s) => s.nextUnit);
  const prevUnit = useAppStore((s) => s.prevUnit);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { isLoading: pageLoading } = usePageLoading(800, currentLessonId);
  const { lesson, isLoading: dataLoading } = useLessonDetail(currentLessonId);
  const { data: courseDetail } = useCourse(courseId || "");
  const { data: courseTree } = useCourseStructure(courseId || "");

  // Scroll to top khi đổi unit
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentUnitIndex]);

  // Kiểm tra bài học đã hoàn thành chưa
  const isCompleted = useMemo(() => {
    if (!courseTree || !lesson) return false;
    for (const mod of courseTree.modules) {
      const found = mod.lessons.find((l) => l.id === lesson.id);
      if (found) return found.completed;
    }
    return false;
  }, [courseTree, lesson]);

  // ── Mutation: Đánh dấu hoàn thành bài học ──
  // Open edX chỉ track completion cho LEAF blocks (html, video).
  // Problem blocks tự mark khi user submit quiz.
  // Nên khi click "Hoàn thành" → mark tất cả html/video blocks trong lesson.
  const leafBlockIds = useMemo(() => {
    if (!lesson) return [];
    return lesson.units.flatMap((unit) =>
      unit.components
        .filter((c) => c.type === "html" || c.type === "video")
        .map((c) => c.id)
    );
  }, [lesson]);

  const completeMutation = useMutation({
    mutationFn: () =>
      markBlocksComplete(user?.username || "", courseId || "", leafBlockIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-blocks"] });
      qc.invalidateQueries({ queryKey: ["course-completion"] });
    },
  });

  // ✅ Hooks phải gọi TRƯỚC mọi early return
  const mentors = useMemo(() => {
    if (lesson?.mentors?.length > 0) return lesson.mentors;
    if (courseDetail?.overview) {
      return parseMentorsFromOverview(courseDetail.overview);
    }
    return [];
  }, [lesson, courseDetail]);

  // Unit navigation handlers
  const totalUnits = lesson?.units.length || 0;
  const currentUnit = lesson?.units[currentUnitIndex] || null;
  const isLastUnit = currentUnitIndex >= totalUnits - 1;

  const handleNext = useCallback(() => {
    // Tự động mark hoàn thành cho các block text/video ở Unit HIỆN TẠI
    if (currentUnit && user?.username && courseId) {
      const leafIdsToMark = currentUnit.components
        .filter((c) => c.type === "html" || c.type === "video")
        .map((c) => c.id);

      if (leafIdsToMark.length > 0) {
        markBlocksComplete(user.username, courseId, leafIdsToMark)
          .catch((e) => console.error("Failed to auto-mark block on next:", e))
          .finally(() => {
            qc.invalidateQueries({ queryKey: ["course-blocks"] });
            qc.invalidateQueries({ queryKey: ["course-completion"] });
          });
      }
    }

    nextUnit(totalUnits);
  }, [currentUnit, user?.username, courseId, qc, nextUnit, totalUnits]);

  const handlePrev = useCallback(() => {
    prevUnit();
  }, [prevUnit]);

  const handleComplete = useCallback(() => {
    if (!isCompleted && leafBlockIds.length > 0) {
      completeMutation.mutate();
    }
  }, [isCompleted, leafBlockIds, completeMutation]);

  if (pageLoading || dataLoading) {
    return <LessonSkeleton />;
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-foreground">
          Nội dung chưa sẵn sàng
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Bài học này chưa có nội dung. Vui lòng chọn bài học khác hoặc liên hệ
          giảng viên.
        </p>
      </div>
    );
  }

  // Handouts URL
  const handoutsUrl = courseDetail?.course_handouts;


  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Main Area */}
      <div className="flex flex-1">
        {/* ── Left: Main Content ── */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          <div className="px-6 py-6 md:px-10 md:py-8">
            {/* Header: Module + Tiêu đề + Progress */}
            <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                {/* Module tag + Lesson counter */}
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
                    {lesson.moduleTag}
                  </span>
                  <span className="text-[13px] font-medium text-muted-foreground">
                    Lesson {Math.min(currentUnitIndex + 1, totalUnits)} of {totalUnits}
                  </span>
                </div>

                {/* Lesson Title */}
                <h1 className="mb-4 text-[32px] md:text-[36px] font-black leading-tight text-foreground">
                  {lesson.title}
                </h1>

                {/* ── Unit Progress Bar under title ── */}
                {totalUnits > 1 && (
                  <div className="h-1.5 w-full max-w-[400px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${((currentUnitIndex + 1) / totalUnits) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Progress Text (Right side) */}
              {totalUnits > 1 && (
                <div className="flex flex-col items-start md:items-end md:text-right shrink-0">
                  <div className="text-[40px] md:text-[48px] font-black text-primary leading-none tracking-tight">
                    {Math.min(currentUnitIndex + 1, totalUnits)}<span className="text-[28px] md:text-[36px]">/{totalUnits}</span>
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-foreground">
                    Phần đã hoàn thành
                  </div>
                </div>
              )}
            </div>

            {/* ── Row: Content + Right sidebar ── */}
            <div className="flex flex-col xl:flex-row gap-6">
              {/* ── Left Column ── */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                {/* Render current Unit components */}
                {currentUnit?.components.map((comp) => {
                  if (comp.type === "video" && comp.videoUrl) {
                    return (
                      <div key={comp.id} className="mb-2">
                        <VideoPlayer lesson={lesson} />
                      </div>
                    );
                  }

                  if (comp.type === "html" && comp.htmlContent) {
                    const cleanHtml = DOMPurify.sanitize(comp.htmlContent, {
                      FORBID_TAGS: ["script", "style"],
                      FORBID_ATTR: ["onerror", "onload", "onclick"],
                    });
                    return (
                      <div key={comp.id} className="rounded-xl border border-border p-6 shadow-sm bg-card mb-6">
                        {comp.displayName && (
                          <div className="mb-4 inline-block">
                            <BadgeCyan><span className="uppercase">{comp.displayName}</span></BadgeCyan>
                          </div>
                        )}
                        <div
                          className="prose prose-sm max-w-none text-[14px] leading-relaxed text-foreground/80 dark:prose-invert dark:text-foreground"
                          dangerouslySetInnerHTML={{ __html: cleanHtml }}
                        />
                      </div>
                    );
                  }

                  if (comp.type === "problem" && comp.problemUsageKey) {
                    return (
                      <QuizContent
                        key={comp.id}
                        problemUsageKey={comp.problemUsageKey}
                      />
                    );
                  }

                  return null;
                })}

                {/* Fallback: Unit has no renderable component */}
                {currentUnit && currentUnit.components.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
                    Phần này chưa có nội dung.
                  </div>
                )}



                {/* ── Navigation Buttons ── */}
                <UnitNavButtons
                  currentIndex={currentUnitIndex}
                  totalUnits={totalUnits}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onComplete={handleComplete}
                  isCompleting={completeMutation.isPending}
                  isLastUnit={isLastUnit}
                  hideCompleteButton={currentUnit?.components.some((c) => c.type === "problem") || false}
                />
              </div>

              {/* ── Right sidebar content (xl+) ── */}
              <div className="hidden xl:flex w-[300px] shrink-0 flex-col gap-6">

                {/* MENTOR — chỉ hiện khi có data thật */}
                <div className="rounded-xl border border-border p-6 shadow-sm bg-card">
                  <BadgeCyan>Mentor</BadgeCyan>
                  <h3 className="mb-5 text-[16px] font-bold text-foreground">
                    Người hướng dẫn
                  </h3>
                  {mentors.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {mentors.map((m, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-foreground truncate">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{m.role}{m.company ? ` · ${m.company}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground italic">Chưa có thông tin Mentor.</p>
                  )}
                </div>

                {/* LeAssociates info block */}
                <div className="rounded-xl border border-border p-6 shadow-sm bg-card">
                  <div className="mb-2">
                    <span className="text-[16px] font-black text-primary">Le</span>
                    <span className="text-[16px] font-black text-accent-foreground">&</span>
                    <span className="text-[16px] font-black text-primary">Associates</span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Le & Associates (L&A), thành viên của L&A Holdings, hiện là
                    một trong những công ty hàng đầu Việt Nam trong dịch vụ nhân
                    lực và thuê ngoài.
                  </p>
                </div>

                {/* Tài liệu tham khảo — từ Course Detail API */}
                <div className="rounded-xl bg-primary p-6 text-primary-foreground shadow-sm">
                  <h3 className="mb-4 text-[16px] font-bold">
                    Tài liệu tham khảo
                  </h3>
                  <div className="flex flex-col gap-3">
                    {handoutsUrl && (
                      <a
                        href={`${config.lmsBaseUrl}${handoutsUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-[13px] font-semibold transition-colors hover:bg-white/20"
                      >
                        <span>Download Assets</span>
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    {!handoutsUrl && (
                      <p className="text-[12px] text-primary-foreground/60 italic">
                        Chưa có tài liệu.
                      </p>
                    )}
                  </div>
                </div>

                {/* AI Mentor hint */}
                <div className="mt-2 rounded-xl border border-border bg-card p-5 text-center shadow-sm">
                  <p className="mb-2 text-[11px] font-bold text-primary tracking-widest uppercase">
                    AI MENTOR
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Bạn cần trợ giúp trong quá trình học?
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Mentor floating button ── */}
      <button
        className="fixed bottom-8 right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-110"
        title="AI Mentor"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 text-center bg-muted/30">
        <p className="text-[12px] text-muted-foreground">
          Copyright © 2017 Le & Associates
        </p>
      </footer>
    </div>
  );
}
