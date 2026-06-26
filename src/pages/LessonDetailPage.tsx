import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { LessonSkeleton } from "@/components/skeletons/LessonSkeleton";
import { QuizContent } from "@/components/lesson/QuizContent";
import { UnitNavButtons } from "@/components/lesson/UnitNavButtons";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useLessonDetail } from "@/hooks/useLessonDetail";
import { useCourse, useCourseStructure, useCourseBlocksRaw } from "@/hooks/useCourses";
import { useCourseFiles } from "@/hooks/useCourseFiles";
import type { CourseFile } from "@/hooks/useCourseFiles";
import { BookOpen, Download, FileText, FileSpreadsheet, Presentation, MessageCircle, CheckCircle2, ChevronUp } from "lucide-react";
import { MentorSidebar } from "@/components/lesson/MentorSidebar";
import { LessonImageCarousel } from "@/components/lesson/LessonImageCarousel";
import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { sanitizeUrlToRelative } from "@/transformers/staticUrlRewriter";
import { storageUrl } from "@/utils/storageUrl";
import type { Mentor, UnitDetail } from "@/data/types";

import { markBlocksComplete } from "@/api/progress";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";
import { CrosswordContent } from "@/components/lesson/CrosswordContent";
import { SortableContent } from "@/components/lesson/SortableContent";
import { FaqContent } from "@/components/lesson/FaqContent";
import { PdfContent } from "@/components/lesson/PdfContent";
import DiagramContent from "@/components/lesson/DiagramContent";
import { HtmlBlockContent } from "@/components/lesson/HtmlBlockContent";
import { CompleteCourseModal } from "@/components/lesson/CompleteCourseModal";
import { Course100PercentModal } from "@/components/lesson/Course100PercentModal";
import { WelcomeCourseModal } from "@/components/lesson/WelcomeCourseModal";
import { SectionCompleteModal } from "@/components/lesson/SectionCompleteModal";
import { useCourseCompletion } from "@/hooks/useProgress";
import { useCourseModalConfig } from "@/hooks/useModalConfig";

// ── Badge component (declared outside render to satisfy React Compiler) ──
const BadgeCyan = ({ children }: { children: React.ReactNode }) => (
  <span
    className="mb-1 inline-block rounded-full px-3 py-1 text-[10px] font-semibold leading-[14px] uppercase tracking-widest"
    style={{ backgroundColor: "#43FDD7", color: "#000" }}
  >
    {children}
  </span>
);

// Block types chỉ cần xem, không cần tương tác → auto-mark complete khi user navigate đến unit
const PASSIVE_BLOCK_TYPES = ["html", "video", "la_diagram", "la_faq", "la_pdf"];
const INTERACTIVE_BLOCK_TYPES = ["problem", "la_crossword", "la_sortable"];

const isStaticOnlyUnit = (unit: UnitDetail) =>
  unit.components.length > 0 &&
  unit.components.every((c) => PASSIVE_BLOCK_TYPES.includes(c.type));

export function LessonDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { completionPercent, isLoading: isProgressLoading } = useCourseCompletion(courseId);
  const { data: modalConfig } = useCourseModalConfig(courseId);
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const currentUnitIndex = useAppStore((s) => s.currentUnitIndex);
  const nextUnit = useAppStore((s) => s.nextUnit);
  const prevUnit = useAppStore((s) => s.prevUnit);
  const setCurrentLesson = useAppStore((s) => s.setCurrentLesson);
  const user = useAuthStore((s) => s.user);
  const colorMode = useThemeStore((s) => s.colorMode);
  const qc = useQueryClient();
  const { isLoading: pageLoading } = usePageLoading(800, currentLessonId);
  const { lesson, isLoading: dataLoading } = useLessonDetail(currentLessonId);
  const { data: courseDetail } = useCourse(courseId || "");
  const { data: courseTree } = useCourseStructure(courseId || "");
  const { data: refDocs = [] } = useCourseFiles(courseId || "");
  const { data: blocksData } = useCourseBlocksRaw(courseId || "");

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
  const isFirstMount = useRef(true);
  useEffect(() => {
    const scrollContainer = document.getElementById("course-main-scroll");
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // F5 reload: browser scroll restoration có thể đẩy content ra khỏi viewport
      // → force scroll to top ngay (instant, không smooth) để unit đầu tiên hiển thị
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      }
      return;
    }
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentUnitIndex]);

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxSrc]);

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
        .filter((c) => c.type === "html" || c.type === "video" || c.type === "la_diagram" || c.type === "la_faq" || c.type === "la_pdf")
        .map((c) => c.id)
    );
  }, [lesson]);

  const completeMutation = useMutation({
    mutationFn: () =>
      markBlocksComplete(courseId || "", leafBlockIds),
    onSuccess: () => {
      refetchProgressWithRetry(qc, courseId);
    },
  });


  // ✅ Hooks phải gọi TRƯỚC mọi early return
  const mentors = useMemo(() => {
    const courseMentors = courseDetail?.mentors ?? [];
    if (courseMentors.length > 0) {
      return courseMentors.map((mentor): Mentor => {
        const avatar = storageUrl(mentor.avatar || mentor.profile_image_url) || null;
        return {
          id: mentor.id,
          username: mentor.username,
          name: mentor.name || mentor.full_name || mentor.email || "Mentor",
          full_name: mentor.full_name || undefined,
          role: mentor.role || "staff",
          company: mentor.company || "",
          avatar,
          email: mentor.email,
          phone_number: mentor.phone_number || mentor.phone || undefined,
          bio: mentor.bio || undefined,
          profile_image_url: avatar,
          profile_image_url_full: avatar,
        };
      });
    }
    return lesson?.mentors ?? [];
  }, [courseDetail?.mentors, lesson?.mentors]);

  const mentorSectionDescription = courseDetail?.mentor_section?.description?.trim() || "";
  const mentorSectionLogo = useMemo(() => {
    const section = courseDetail?.mentor_section;
    if (!section) return null;
    const path = colorMode === "dark"
      ? section.logo_dark || section.logo_light
      : section.logo_light || section.logo_dark;
    return storageUrl(path || "") || null;
  }, [
    colorMode,
    courseDetail?.mentor_section?.logo_dark,
    courseDetail?.mentor_section?.logo_light,
  ]);
  const hasMentorSectionInfo = Boolean(mentorSectionDescription || mentorSectionLogo);

  // Unit navigation handlers
  const totalUnits = lesson?.units.length || 0;
  // Clamp unitIndex — sessionStorage có thể lưu index cũ vượt quá units mới
  const safeUnitIndex = totalUnits > 0 ? Math.min(currentUnitIndex, totalUnits - 1) : 0;
  const currentUnit = lesson?.units[safeUnitIndex] || null;
  const isLastUnit = safeUnitIndex >= totalUnits - 1;

  // Xác định next lesson & module trong toàn bộ course structure
  const { nextLessonId, nextModuleId } = useMemo(() => {
    let nLessonId: string | null = null;
    let nModuleId: string | null = null;
    if (courseTree && currentLessonId) {
      let foundCurrent = false;
      for (const mod of courseTree.modules) {
        for (const l of mod.lessons) {
          if (foundCurrent) {
            nLessonId = l.id;
            nModuleId = mod.id;
            break;
          }
          if (l.id === currentLessonId) {
            foundCurrent = true;
          }
        }
        if (nLessonId) break;
      }
    }
    return { nextLessonId: nLessonId, nextModuleId: nModuleId };
  }, [courseTree, currentLessonId]);

  // Derived states cho logic hiển thị nút Hoàn thành và Auto-Complete
  const isLastSection = !nextLessonId; // Không còn lesson tiếp

  // Case A: 1 unit, toàn static
  const isCaseA = totalUnits === 1 && currentUnit && isStaticOnlyUnit(currentUnit);

  // Case C: nhiều unit, unit cuối toàn static
  const isCaseC = isLastUnit && totalUnits > 1 && currentUnit && isStaticOnlyUnit(currentUnit);

  // Nút "Hoàn thành" chỉ hiện khi (Case A hoặc C) VÀ section cuối
  const showManualComplete = (isCaseA || isCaseC) && isLastSection;

  // Kiểm tra unit trước đã hoàn thành chưa (chỉ dùng cho Case C)
  const allPreviousUnitsCompleted = useMemo(() => {
    if (!blocksData?.blocks || !lesson || safeUnitIndex === 0) return true;
    const prevUnits = lesson.units.slice(0, safeUnitIndex);
    for (const unit of prevUnits) {
      for (const comp of unit.components) {
        const block = blocksData.blocks[comp.id];
        // Open edX blocks trả completion = 1.0 khi hoàn thành.
        if (block && (block.completion ?? 0) < 1) {
          return false;
        }
      }
    }
    return true;
  }, [blocksData, lesson, safeUnitIndex]);

  // ── Auto-mark passive blocks khi user vào unit ──
  // Các block dạng xem (html, video, faq, pdf, diagram) → auto-complete ngay khi navigate đến (ngoại trừ Case A/C ở section cuối).
  useEffect(() => {
    if (!currentUnit || !user?.username || !courseId) return;

    // Nếu cần hiện nút "Hoàn thành" thủ công → KHÔNG auto-complete
    if (showManualComplete) return;

    const passiveIds = currentUnit.components
      .filter((c) => PASSIVE_BLOCK_TYPES.includes(c.type))
      .map((c) => c.id);

    if (passiveIds.length === 0) return;

    markBlocksComplete(courseId, passiveIds)
      .then(() => {
        refetchProgressWithRetry(qc, courseId);
      })
      .catch((e) => console.error("Failed to auto-mark passive blocks:", e));
  }, [currentUnit?.id, user?.username, courseId, showManualComplete]);

  const handleNextLesson = useCallback(() => {
    if (nextModuleId && nextLessonId) {
      setCurrentLesson(nextModuleId, nextLessonId);
      navigate(`/courses/${encodeURIComponent(courseId || "c1")}/lessons/${nextLessonId}`);
    }
  }, [nextModuleId, nextLessonId, setCurrentLesson, navigate, courseId]);

  const handleNext = useCallback(() => {
    // Passive blocks (html, video, faq...) đã được auto-mark bởi useEffect khi user vào unit.
    // KHÔNG cần mark lại ở đây — tránh duplicate POST + refetch cascade.
    nextUnit(totalUnits);
  }, [nextUnit, totalUnits]);

  const handlePrev = useCallback(() => {
    prevUnit();
  }, [prevUnit]);

  const handleComplete = useCallback(() => {
    if (!isCompleted && leafBlockIds.length > 0) {
      completeMutation.mutate();
    }
  }, [isCompleted, leafBlockIds, completeMutation]);

  // Reset scroll khi chuyển từ skeleton → content thực
  const wasLoadingRef = useRef(true);
  const isStillLoading = pageLoading || dataLoading;
  useEffect(() => {
    if (wasLoadingRef.current && !isStillLoading) {
      const scrollEl = document.getElementById("course-main-scroll");
      if (scrollEl) {
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'manual';
        }
        scrollEl.scrollTop = 0;
      }
    }
    wasLoadingRef.current = isStillLoading;
  }, [isStillLoading]);

  if (isStillLoading) {
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
          <div className="w-full px-6 py-6 md:px-7 md:py-8 2xl:px-8 2xl:py-12">
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
            <div className="flex flex-col xl:flex-row gap-8 xl:gap-8">
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

                  if (comp.type === "html" && (comp.htmlContent || (comp.htmlMediaImages?.length || 0) > 0)) {
                    return (
                      <HtmlBlockContent
                        key={comp.id}
                        htmlContent={comp.htmlContent || ""}
                        uploadedImages={comp.htmlMediaImages}
                        displayName={comp.displayName}
                        onImageClick={(src) => setLightboxSrc(src)}
                      />
                    );
                  }


                  if (comp.type === "problem" && comp.problemUsageKey) {
                    return (
                      <QuizContent
                        key={comp.id}
                        problemUsageKey={comp.problemUsageKey}
                        problemMedia={comp.problemMedia}
                        onImageClick={(src) => setLightboxSrc(src)}
                      />
                    );
                  }

                  if (comp.type === "la_crossword" && comp.crosswordUsageKey) {
                    return (
                      <CrosswordContent
                        key={comp.id}
                        usageKey={comp.crosswordUsageKey}
                        problemMedia={comp.problemMedia}
                        onImageClick={(src) => setLightboxSrc(src)}
                      />
                    );
                  }

                  if (comp.type === "la_sortable" && comp.sortableUsageKey) {
                    return (
                      <SortableContent
                        key={comp.id}
                        usageKey={comp.sortableUsageKey}
                        problemMedia={comp.problemMedia}
                        onImageClick={(src) => setLightboxSrc(src)}
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

                  if (comp.type === "la_faq" && comp.faqUsageKey) {
                    return (
                      <FaqContent
                        key={comp.id}
                        usageKey={comp.faqUsageKey}
                      />
                    );
                  }

                  if (comp.type === "la_pdf" && comp.pdfUrl) {
                    return (
                      <PdfContent
                        key={comp.id}
                        usageKey={comp.id}
                      />
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
                  hideCompleteButton={!showManualComplete}
                  disableCompleteButton={isCaseC && isLastSection && !allPreviousUnitsCompleted}
                  onNextLesson={handleNextLesson}
                  hasNextLesson={!!nextLessonId}
                />
              </div>

              {/* ── Right sidebar content (xl+) ── */}
              <div className="hidden xl:flex w-[260px] shrink-0 flex-col gap-6">

                {/* MENTOR & COMPANY INFO CARD */}
                <div className="rounded-3xl border border-border shadow-sm bg-card flex flex-col">
                  {/* Top: Mentor section */}
                  <div className="px-8 pt-7 pb-2">
                    <BadgeCyan>Mentor</BadgeCyan>
                    <h3 className="mb-1 mt-1 text-[20px] font-semibold leading-[28px] text-foreground">
                      Người hướng dẫn
                    </h3>
                  </div>
                  <MentorSidebar mentors={mentors} companyLogo={mentorSectionLogo} />

                  {/* Divider */}
                  <div className="mx-8 border-t border-border/60" />

                  {/* Bottom: Company section */}
                  <div className="px-8 py-4">
                    {hasMentorSectionInfo ? (
                      <>
                        {mentorSectionLogo && (
                          <img
                            src={mentorSectionLogo}
                            alt=""
                            className="h-6 w-auto object-contain object-left mb-4"
                          />
                        )}
                        {mentorSectionDescription ? (
                          <p className="text-[14px] font-normal leading-[18px] text-muted-foreground whitespace-pre-line">
                            {mentorSectionDescription}
                          </p>
                        ) : (
                          <p className="text-[14px] font-normal leading-[18px] text-muted-foreground italic">
                            Chưa có thông tin
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[14px] font-normal leading-[18px] text-muted-foreground italic">
                        Chưa có thông tin
                      </p>
                    )}
                  </div>
                </div>

                {/* Tài liệu tham khảo — LANDA API: file unlocked trên Studio */}
                <div className="rounded-3xl bg-primary p-8 text-primary-foreground shadow-sm">
                  <h3 className="mb-4 text-[20px] font-semibold leading-[24px]">
                    Tài liệu tham khảo
                  </h3>
                  {refDocs.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {refDocs.slice(0, 8).map((doc: CourseFile) => {
                        const DocIcon = getDocIcon(doc.extension);
                        return (
                          <a
                            key={doc.id}
                            href={doc.fullUrl.includes('?') ? `${doc.fullUrl}&download=1` : `${doc.fullUrl}?download=1`}
                            download={doc.display_name}
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

      {/* ── Floating buttons — Portal to body để thoát khỏi motion.div transform ── */}
      {createPortal(
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
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
        </div>,
        document.body
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 text-center bg-muted/30">
        <p className="text-[14px] font-normal leading-[18px] text-muted-foreground">
          Copyright © 2017 Le & Associates
        </p>
      </footer>

      {courseId && <WelcomeCourseModal courseId={courseId} completionPercent={completionPercent} isLoading={isProgressLoading} config={modalConfig} />}
      {courseId && <CompleteCourseModal courseId={courseId} completionPercent={completionPercent} isLoading={isProgressLoading} config={modalConfig} />}
      {courseId && <Course100PercentModal courseId={courseId} completionPercent={completionPercent} isLoading={isProgressLoading} config={modalConfig} />}
      {courseId && courseTree && <SectionCompleteModal courseId={courseId} modules={courseTree.modules} />}

      {/* ── Image Lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
          style={{ animation: "fadeIn 0.15s ease" }}
        >
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-5 right-6 text-white/70 hover:text-white text-[32px] leading-none font-light transition-colors"
            onClick={() => setLightboxSrc(null)}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
