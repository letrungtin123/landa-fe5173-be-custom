import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { LessonSkeleton } from "@/components/skeletons/LessonSkeleton";
import { QuizContent } from "@/components/lesson/QuizContent";
import { UnitNavButtons } from "@/components/lesson/UnitNavButtons";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLessonDetail } from "@/hooks/useLessonDetail";
import { useCourse, useCourseStructure, useCourseMentors } from "@/hooks/useCourses";
import { useCourseFiles } from "@/hooks/useCourseFiles";
import type { CourseFile } from "@/hooks/useCourseFiles";
import { BookOpen, Download, FileText, FileSpreadsheet, Presentation, MessageCircle, CheckCircle2, ChevronUp } from "lucide-react";
import { MentorSidebar } from "@/components/lesson/MentorSidebar";
import { useParams } from "react-router-dom";
import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { config } from "@/config/env";
import { markBlocksComplete } from "@/api/progress";
import { CrosswordContent } from "@/components/lesson/CrosswordContent";
import { SortableContent } from "@/components/lesson/SortableContent";
import DiagramContent from "@/components/lesson/DiagramContent";
import { CompleteCourseModal } from "@/components/lesson/CompleteCourseModal";
import { Course100PercentModal } from "@/components/lesson/Course100PercentModal";
import { WelcomeCourseModal } from "@/components/lesson/WelcomeCourseModal";
import { SectionCompleteModal } from "@/components/lesson/SectionCompleteModal";
import { useCourseCompletion } from "@/hooks/useProgress";
import { useCourseModalConfig } from "@/hooks/useModalConfig";
import LogoLanda from "@/assets/leandassociate.webp";

// ── Badge component (declared outside render to satisfy React Compiler) ──
const BadgeCyan = ({ children }: { children: React.ReactNode }) => (
  <span
    className="mb-1 inline-block rounded-full px-3 py-1 text-[10px] font-bold leading-[14px] uppercase tracking-widest"
    style={{ backgroundColor: "#43FDD7", color: "#000" }}
  >
    {children}
  </span>
);

export function LessonDetailPage() {
  const { courseId } = useParams();
  const { completionPercent, isLoading: isProgressLoading } = useCourseCompletion(courseId);
  const { data: modalConfig } = useCourseModalConfig(courseId);
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const currentUnitIndex = useAppStore((s) => s.currentUnitIndex);
  const nextUnit = useAppStore((s) => s.nextUnit);
  const prevUnit = useAppStore((s) => s.prevUnit);
  const setCurrentLesson = useAppStore((s) => s.setCurrentLesson);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { isLoading: pageLoading } = usePageLoading(800, currentLessonId);
  const { lesson, isLoading: dataLoading } = useLessonDetail(currentLessonId);
  const { data: courseDetail } = useCourse(courseId || "");
  const { data: courseTree } = useCourseStructure(courseId || "");
  const { data: fetchedMentors } = useCourseMentors(courseId || "");
  const { data: refDocs = [] } = useCourseFiles(courseId || "");

  // Auto-select first lesson if none is selected or not in current course
  useEffect(() => {
    if (courseTree && courseTree.modules && courseTree.modules.length > 0) {
      let lessonExists = false;
      if (currentLessonId) {
        for (const mod of courseTree.modules) {
          if (mod.lessons.some((l) => l.id === currentLessonId)) {
            lessonExists = true;
            break;
          }
        }
      }

      if (!lessonExists) {
        const firstMod = courseTree.modules[0];
        if (firstMod && firstMod.lessons && firstMod.lessons.length > 0) {
          const firstLesson = firstMod.lessons[0];
          setCurrentLesson(firstMod.id, firstLesson.id);
        }
      }
    }
  }, [courseTree, currentLessonId, setCurrentLesson]);

  // Scroll to top khi đổi unit
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scrollContainer = document.getElementById("course-main-scroll");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentUnitIndex]);

  // Hook lắng nghe sự kiện scroll để hiện nút Back to Top
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const scrollContainer = document.getElementById("course-main-scroll");
    if (!scrollContainer) return;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setShowScrollTop(target.scrollTop > 400);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

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
        .filter((c) => c.type === "html" || c.type === "video" || c.type === "la_diagram")
        .map((c) => c.id)
    );
  }, [lesson]);

  const completeMutation = useMutation({
    mutationFn: () =>
      markBlocksComplete(user?.username || "", courseId || "", leafBlockIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-blocks"] });
      qc.invalidateQueries({ queryKey: ["course-completion-fast"] });
    },
  });

  // ✅ Hooks phải gọi TRƯỚC mọi early return
  const mentors = useMemo(() => {
    if (!fetchedMentors || fetchedMentors.length === 0) return [];
    return fetchedMentors.map((m) => ({
      id: m.id,
      username: m.username,
      name: m.name || m.full_name,
      full_name: m.full_name,
      role: m.role,
      company: '',
      email: m.email,
      phone_number: m.phone_number,
      bio: m.bio,
      avatar: m.profile_image_url
        ? (m.profile_image_url.startsWith('http') ? m.profile_image_url : `${config.lmsBaseUrl}${m.profile_image_url}`)
        : null,
      profile_image_url: m.profile_image_url
        ? (m.profile_image_url.startsWith('http') ? m.profile_image_url : `${config.lmsBaseUrl}${m.profile_image_url}`)
        : null,
      profile_image_url_full: m.profile_image_url_full
        ? (m.profile_image_url_full.startsWith('http') ? m.profile_image_url_full : `${config.lmsBaseUrl}${m.profile_image_url_full}`)
        : null,
    }));
  }, [fetchedMentors]);

  // Unit navigation handlers
  const totalUnits = lesson?.units.length || 0;
  const currentUnit = lesson?.units[currentUnitIndex] || null;
  const isLastUnit = currentUnitIndex >= totalUnits - 1;

  const handleNext = useCallback(() => {
    // Tự động mark hoàn thành cho các block text/video ở Unit HIỆN TẠI
    if (currentUnit && user?.username && courseId) {
      const leafIdsToMark = currentUnit.components
        .filter((c) => c.type === "html" || c.type === "video" || c.type === "la_diagram")
        .map((c) => c.id);

      if (leafIdsToMark.length > 0) {
        markBlocksComplete(user.username, courseId, leafIdsToMark)
          .catch((e) => console.error("Failed to auto-mark block on next:", e))
          .finally(() => {
            qc.invalidateQueries({ queryKey: ["course-blocks"] });
            qc.invalidateQueries({ queryKey: ["course-completion-fast"] });
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
        <h2 className="mb-2 text-[20px] font-bold leading-[24px] text-foreground">
          Nội dung chưa sẵn sàng
        </h2>
        <p className="text-[14px] font-normal leading-[18px] text-muted-foreground max-w-md">
          Bài học này chưa có nội dung. Vui lòng chọn bài học khác hoặc liên hệ
          giảng viên.
        </p>
      </div>
    );
  }

  // Icon theo loại file
  function getDocIcon(ext: string) {
    if (["pdf", "doc", "docx"].includes(ext)) return FileText;
    if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
    if (["ppt", "pptx"].includes(ext)) return Presentation;
    return FileText;
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Main Area */}
      <div className="flex flex-1">
        {/* ── Left: Main Content ── */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          <div className="w-full px-6 py-6 md:px-10 md:py-8 2xl:px-16 2xl:py-12">
            {/* Header: Module + Tiêu đề + Progress */}
            <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex-1">
                {/* Module tag + Lesson counter */}
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span
                    className="inline-block rounded-full px-4 py-1.5 text-[10px] 2xl:text-[12px] font-bold leading-[14px] uppercase tracking-wider"
                    style={{ backgroundColor: "#43FDD7", color: "#000" }}
                  >
                    {lesson.moduleTag}
                  </span>
                  <span className="text-[14px] 2xl:text-[16px] font-normal leading-[18px] 2xl:leading-[22px] text-muted-foreground">
                    Lesson {Math.min(currentUnitIndex + 1, totalUnits)} of {totalUnits}
                  </span>
                </div>

                {/* Lesson Title */}
                <h1 className="text-[42px] 2xl:text-[52px] font-semibold leading-[48px] 2xl:leading-[58px] text-foreground">
                  {lesson.title}
                </h1>
              </div>

              {/* Progress Text (Right side) */}
              {totalUnits > 1 && (
                <div className="flex flex-col items-start md:items-end md:text-right shrink-0">
                  <div className="text-[36px] font-semibold leading-[40px] text-primary tracking-tight">
                    {Math.min(currentUnitIndex + 1, totalUnits)}<span className="text-[20px] font-semibold leading-[24px]">/{totalUnits}</span>
                  </div>
                  <div className="mt-2 text-[14px] font-semibold leading-[18px] text-foreground">
                    Phần đã hoàn thành
                  </div>
                </div>
              )}
            </div>

            {/* ── Unit Progress Bar full width ── */}
            {totalUnits > 1 && (
              <div className="mb-8 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${((currentUnitIndex + 1) / totalUnits) * 100}%` }}
                />
              </div>
            )}

            {/* ── Row: Content + Right sidebar ── */}
            <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
              {/* ── Left Column ── */}
              <div className="flex-1 min-w-0 flex flex-col gap-5">
                {/* Render current Unit components */}
                {currentUnit?.components.map((comp) => {
                  if (comp.type === "video" && comp.videoUrl) {
                    return (
                      <div key={comp.id}>
                        <VideoPlayer lesson={lesson} videoUrl={comp.videoUrl} />
                      </div>
                    );
                  }

                  if (comp.type === "html" && comp.htmlContent) {
                    const cleanHtml = DOMPurify.sanitize(comp.htmlContent, {
                      FORBID_TAGS: ["script", "style"],
                      FORBID_ATTR: ["onerror", "onload", "onclick"],
                    });
                    return (
                      <div key={comp.id} className="rounded-3xl border border-border px-8 py-7 shadow-sm bg-card">
                        {comp.displayName && (
                          <div className="mb-1 inline-block">
                            <BadgeCyan><span className="uppercase">{comp.displayName}</span></BadgeCyan>
                          </div>
                        )}
                        <div
                          className="prose max-w-none text-[14px] 2xl:text-[16px] font-normal leading-[18px] 2xl:leading-[24px] text-foreground/80 dark:prose-invert dark:text-foreground [&_p]:!text-[14px] 2xl:[&_p]:!text-[16px] [&_p]:!font-normal [&_p]:!leading-[18px] 2xl:[&_p]:!leading-[24px] [&_span]:!text-[14px] 2xl:[&_span]:!text-[16px] [&_span]:!font-normal [&_span]:!leading-[18px] 2xl:[&_span]:!leading-[24px] [&_li]:!text-[14px] 2xl:[&_li]:!text-[16px] [&_li]:!font-normal [&_li]:!leading-[18px] 2xl:[&_li]:!leading-[24px] [&_div]:!text-[14px] 2xl:[&_div]:!text-[16px] [&_div]:!font-normal [&_div]:!leading-[18px] 2xl:[&_div]:!leading-[24px] [&_h1]:!text-[36px] 2xl:[&_h1]:!text-[42px] [&_h1]:!font-semibold [&_h1]:!leading-[40px] 2xl:[&_h1]:!leading-[48px] [&_h2]:!text-[20px] 2xl:[&_h2]:!text-[24px] [&_h2]:!font-bold [&_h2]:!leading-[24px] 2xl:[&_h2]:!leading-[32px] [&_h3]:!text-[20px] 2xl:[&_h3]:!text-[24px] [&_h3]:!font-bold [&_h3]:!leading-[24px] 2xl:[&_h3]:!leading-[32px]"
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

                  if (comp.type === "la_crossword" && comp.crosswordUsageKey) {
                    return (
                      <CrosswordContent
                        key={comp.id}
                        usageKey={comp.crosswordUsageKey}
                      />
                    );
                  }

                  if (comp.type === "la_sortable" && comp.sortableUsageKey) {
                    return (
                      <SortableContent
                        key={comp.id}
                        usageKey={comp.sortableUsageKey}
                      />
                    );
                  }

                  if (comp.type === "la_diagram" && comp.diagramData) {
                    return (
                      <div key={comp.id} className="rounded-3xl border border-border p-4 shadow-sm bg-card">
                        <DiagramContent data={comp.diagramData} />
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Fallback: Unit has no renderable component */}
                {currentUnit && currentUnit.components.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-border px-8 py-7 text-center text-[14px] font-normal leading-[18px] text-muted-foreground">
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
                  isCompleted={isCompleted}
                  isLastUnit={isLastUnit}
                  hideCompleteButton={currentUnit?.components.some((c) => c.type === "problem") || false}
                />
              </div>

              {/* ── Right sidebar content (xl+) ── */}
              <div className="hidden xl:flex w-[300px] shrink-0 flex-col gap-6">

                {/* MENTOR & COMPANY INFO CARD */}
                <div className="rounded-3xl border border-border shadow-sm bg-card flex flex-col">
                  {/* Top: Mentor section */}
                  <div className="px-8 pt-7 pb-2">
                    <BadgeCyan>Mentor</BadgeCyan>
                    <h3 className="mb-1 text-[24px] font-bold leading-[28px] text-foreground">
                      Người hướng dẫn
                    </h3>
                  </div>
                  <MentorSidebar mentors={mentors} />

                  {/* Divider */}
                  <div className="mx-8 border-t border-border/60" />

                  {/* Bottom: Company section */}
                  <div className="px-8 py-7">
                    <img
                      src={LogoLanda}
                      alt="Le & Associates"
                      className="h-6 w-auto object-contain object-left mb-4"
                    />
                    <p className="text-[14px] font-normal leading-[18px] text-muted-foreground">
                      Le & Associates (L&A), thành viên của L&A Holdings, hiện là
                      một trong những công ty hàng đầu tại Việt Nam trong dịch vụ nhân
                      lực và thuê ngoài.
                    </p>
                  </div>
                </div>

                {/* Tài liệu tham khảo — LANDA API: file unlocked trên Studio */}
                <div className="rounded-3xl bg-primary p-8 text-primary-foreground shadow-sm">
                  <h3 className="mb-4 text-[20px] font-bold leading-[24px]">
                    Tài liệu tham khảo
                  </h3>
                  {refDocs.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {refDocs.slice(0, 8).map((doc: CourseFile) => {
                        const DocIcon = getDocIcon(doc.extension);
                        return (
                          <a
                            key={doc.id}
                            href={doc.fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2.5 text-[14px] font-normal leading-[18px] transition-colors hover:bg-white/20 gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <DocIcon className="h-4 w-4 shrink-0 opacity-80" />
                              <span className="truncate">{doc.display_name}</span>
                            </div>
                            <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          </a>
                        );
                      })}
                      {refDocs.length > 8 && (
                        <p className="mt-1 text-center text-[10px] font-semibold leading-[14px] text-primary-foreground/60">
                          +{refDocs.length - 8} tài liệu khác
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[14px] font-normal leading-[18px] text-primary-foreground/60 italic">
                      Chưa có tài liệu...
                    </p>
                  )}
                </div>

                {/* AI Mentor hint */}
                <div className="mt-2 rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                  <p className="mb-2 text-[10px] font-bold leading-[14px] text-primary tracking-widest uppercase">
                    AI MENTOR
                  </p>
                  <p className="text-[14px] font-normal leading-[18px] text-muted-foreground">
                    Bạn cần trợ giúp trong quá trình học?
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Mentor floating button ── */}
      <div className="fixed bottom-8 right-8 z-30 flex flex-col gap-4">
        {/* Nút Cuộn Lên Đầu Trang */}
        <button
          onClick={() => {
            const scrollContainer = document.getElementById("course-main-scroll");
            if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-all hover:scale-110",
            showScrollTop ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
          )}
          title="Lên đầu trang"
        >
          <ChevronUp className="h-6 w-6" />
        </button>

        {/* Nút AI Mentor (Tạm ẩn)
        <button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-110"
          title="AI Mentor"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        */}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 text-center bg-muted/30">
        <p className="text-[14px] font-normal leading-[18px] text-muted-foreground">
          Copyright © 2017 Le & Associates
        </p>
      </footer>

      {courseId && <WelcomeCourseModal courseId={courseId} completionPercent={completionPercent} isLoading={isProgressLoading} config={modalConfig} />}
      {courseId && <CompleteCourseModal courseId={courseId} config={modalConfig} />}
      {courseId && <Course100PercentModal courseId={courseId} completionPercent={completionPercent} isLoading={isProgressLoading} config={modalConfig} />}
      {courseId && courseTree && <SectionCompleteModal courseId={courseId} modules={courseTree.modules} />}
    </div>
  );
}
