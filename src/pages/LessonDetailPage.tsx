import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { LessonSkeleton } from "@/components/skeletons/LessonSkeleton";
import { QuizContent } from "@/components/lesson/QuizContent";
import { MediaQuizContent } from "@/components/lesson/MediaQuizContent";
import { UnitNavButtons } from "@/components/lesson/UnitNavButtons";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useLessonDetail } from "@/hooks/useLessonDetail";
import { useCourse, useCourseStructure, useCourseBlocksRaw } from "@/hooks/useCourses";
import { useCourseFiles } from "@/hooks/useCourseFiles";
import type { CourseFile } from "@/hooks/useCourseFiles";
import { BookOpen, Download, FileText, FileSpreadsheet, Presentation, CheckCircle2, ChevronUp } from "lucide-react";
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
import { WelcomeCourseModal } from "@/components/lesson/WelcomeCourseModal";
import { SectionCompleteModal } from "@/components/lesson/SectionCompleteModal";
import { useCourseCompletion } from "@/hooks/useProgress";
import { useCourseModalConfig } from "@/hooks/useModalConfig";
import { useBranding } from "@/hooks/useBranding";
import {
  clearDemoIframeLessonVideoPending,
  DEMO_IFRAME_EXPLORE_COURSE_ID,
  DEMO_IFRAME_LESSON_QUIZ_ASSIST_EVENT,
  DEMO_IFRAME_LESSON_QUIZ_QUESTION,
  DEMO_IFRAME_LESSON_QUIZ_GUIDE_EVENT,
  DEMO_IFRAME_LESSON_QUIZ_HINT_TO_ANSWER_DELAY_MS,
  demoIframeLessonVideoKey,
  isDemoIframeLessonVideoPending,
  setDemoIframeFlowLock,
  type DemoIframeLessonQuizGuidePhase,
} from "@/utils/demoIframeDashboardGuide";
import { lockDemoIframeUserScroll } from "@/utils/demoIframeGuideLock";
import {
  DEMO_IFRAME_GUIDE_SCROLL_LONG_MS,
  DEMO_IFRAME_GUIDE_SCROLL_SHORT_MS,
  scrollDemoIframeElementToCenter,
} from "@/utils/demoIframeSmoothScroll";

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
const INTERACTIVE_BLOCK_TYPES = ["problem", "la_media_quiz", "la_crossword", "la_sortable"];
const DEMO_IFRAME_LESSON_QUIZ_SCROLL_DELAY_MS = 11000;
const DEMO_IFRAME_LESSON_QUIZ_SCROLL_DURATION_MS = 1800;
const DEMO_IFRAME_LESSON_QUIZ_ASSIST_DELAY_MS = 2000;
const DEMO_IFRAME_FLOW_LOCK_LESSON = "lesson-flow";

const isStaticOnlyUnit = (unit: UnitDetail) =>
  unit.components.length > 0 &&
  unit.components.every((c) => PASSIVE_BLOCK_TYPES.includes(c.type));

type DemoVideoGuideRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

function findDemoLessonVideoElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-demo-lesson-video-guide="true"]');
}

function findDemoLessonQuizElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-demo-lesson-quiz-guide="true"]');
}

function getDemoLessonVideoGuideRect(element: HTMLElement, padding = 0): DemoVideoGuideRect {
  const rect = element.getBoundingClientRect();
  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const right = Math.min(window.innerWidth, rect.right + padding);
  const bottom = Math.min(window.innerHeight, rect.bottom + padding);

  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function LessonDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { completionPercent, isLoading: isProgressLoading } = useCourseCompletion(courseId);
  const { data: modalConfig } = useCourseModalConfig(courseId);
  const { branding } = useBranding();
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const currentUnitIndex = useAppStore((s) => s.currentUnitIndex);
  const nextUnit = useAppStore((s) => s.nextUnit);
  const prevUnit = useAppStore((s) => s.prevUnit);
  const setCurrentLesson = useAppStore((s) => s.setCurrentLesson);
  const setUnitIndex = useAppStore((s) => s.setUnitIndex);
  const user = useAuthStore((s) => s.user);
  const loginSessionId = useAuthStore((s) => s.loginSessionId);
  const sessionMode = useAuthStore((s) => s.sessionMode);
  const colorMode = useThemeStore((s) => s.colorMode);
  const qc = useQueryClient();
  const [demoLessonVideoGuideActive, setDemoLessonVideoGuideActive] = useState(false);
  const [demoLessonVideoGuideRect, setDemoLessonVideoGuideRect] = useState<DemoVideoGuideRect | null>(null);
  const [demoLessonQuizScrollRequested, setDemoLessonQuizScrollRequested] = useState(false);
  const [demoLessonPostVideoLockActive, setDemoLessonPostVideoLockActive] = useState(false);
  const [demoLessonQuizGuidePhase, setDemoLessonQuizGuidePhase] = useState<DemoIframeLessonQuizGuidePhase>("idle");
  const demoLessonQuizScrollTimerRef = useRef<number | null>(null);
  const demoLessonQuizAssistTimerRef = useRef<number | null>(null);
  const demoLessonQuizGuideAnswerTimerRef = useRef<number | null>(null);
  const demoLessonQuizScrollAnimationRef = useRef<(() => void) | null>(null);
  const demoLessonQuizScrollStartedRef = useRef(false);
  const { isLoading: pageLoading } = usePageLoading(800, currentLessonId);
  const { lesson, isLoading: dataLoading } = useLessonDetail(currentLessonId);
  const { data: courseDetail } = useCourse(courseId || "");
  const { data: courseTree } = useCourseStructure(courseId || "");
  const { data: refDocs = [] } = useCourseFiles(courseId || "");
  const { data: blocksData } = useCourseBlocksRaw(courseId || "");
  const isDemoIframe = sessionMode === "demo_iframe";
  const demoLessonVideoGuideKey = useMemo(
    () => demoIframeLessonVideoKey(user?.id, loginSessionId),
    [loginSessionId, user?.id]
  );

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
  const tenantName = branding.tenantName || user?.tenantName || "Le & Associates";

  // Unit navigation handlers
  const totalUnits = lesson?.units.length || 0;
  // Clamp unitIndex — sessionStorage có thể lưu index cũ vượt quá units mới
  const safeUnitIndex = totalUnits > 0 ? Math.min(currentUnitIndex, totalUnits - 1) : 0;
  const currentUnit = lesson?.units[safeUnitIndex] || null;
  const isLastUnit = safeUnitIndex >= totalUnits - 1;
  const demoGuideVideoComponentId = useMemo(() => {
    if (!currentUnit) return "";
    return currentUnit.components.find((component) =>
      component.type === "video" && Boolean(component.videoUrl)
    )?.id || "";
  }, [currentUnit]);
  const demoGuideQuizComponentId = useMemo(() => {
    if (!currentUnit) return "";
    return currentUnit.components.find((component) =>
      component.type === "problem" && Boolean(component.problemUsageKey)
    )?.id || "";
  }, [currentUnit]);

  const clearDemoLessonVideoGuide = useCallback(() => {
    if (demoLessonVideoGuideKey) {
      clearDemoIframeLessonVideoPending(demoLessonVideoGuideKey);
    }
    setDemoLessonVideoGuideActive(false);
    setDemoLessonVideoGuideRect(null);
  }, [demoLessonVideoGuideKey]);

  const clearDemoLessonQuizScrollTimer = useCallback(() => {
    if (demoLessonQuizScrollTimerRef.current !== null) {
      window.clearTimeout(demoLessonQuizScrollTimerRef.current);
      demoLessonQuizScrollTimerRef.current = null;
    }
  }, []);

  const clearDemoLessonQuizAssistTimer = useCallback(() => {
    if (demoLessonQuizAssistTimerRef.current !== null) {
      window.clearTimeout(demoLessonQuizAssistTimerRef.current);
      demoLessonQuizAssistTimerRef.current = null;
    }
  }, []);

  const clearDemoLessonQuizGuideAnswerTimer = useCallback(() => {
    if (demoLessonQuizGuideAnswerTimerRef.current !== null) {
      window.clearTimeout(demoLessonQuizGuideAnswerTimerRef.current);
      demoLessonQuizGuideAnswerTimerRef.current = null;
    }
  }, []);

  const clearDemoLessonQuizScrollAnimation = useCallback(() => {
    if (demoLessonQuizScrollAnimationRef.current) {
      demoLessonQuizScrollAnimationRef.current();
      demoLessonQuizScrollAnimationRef.current = null;
    }
  }, []);

  const scheduleDemoLessonQuizAssist = useCallback(() => {
    clearDemoLessonQuizAssistTimer();
    demoLessonQuizAssistTimerRef.current = window.setTimeout(() => {
      demoLessonQuizAssistTimerRef.current = null;
      window.dispatchEvent(
        new CustomEvent(DEMO_IFRAME_LESSON_QUIZ_ASSIST_EVENT, {
          detail: { question: DEMO_IFRAME_LESSON_QUIZ_QUESTION },
        })
      );
    }, DEMO_IFRAME_LESSON_QUIZ_ASSIST_DELAY_MS);
  }, [clearDemoLessonQuizAssistTimer]);

  const startDemoLessonQuizGuide = useCallback(() => {
    if (!isDemoIframe || courseId !== DEMO_IFRAME_EXPLORE_COURSE_ID || !demoGuideQuizComponentId) return;

    clearDemoLessonQuizGuideAnswerTimer();
    setDemoLessonPostVideoLockActive(true);
    setDemoLessonQuizGuidePhase("hint");

    window.requestAnimationFrame(() => {
      const target = findDemoLessonQuizElement();
      if (target) {
        scrollDemoIframeElementToCenter(target, {
          durationMs: DEMO_IFRAME_GUIDE_SCROLL_SHORT_MS,
        });
      }
    });
  }, [
    clearDemoLessonQuizGuideAnswerTimer,
    courseId,
    demoGuideQuizComponentId,
    isDemoIframe,
  ]);

  const handleDemoLessonQuizHintClick = useCallback(() => {
    if (demoLessonQuizGuidePhase !== "hint") return;

    clearDemoLessonQuizGuideAnswerTimer();
    setDemoLessonQuizGuidePhase("hint-waiting");
    demoLessonQuizGuideAnswerTimerRef.current = window.setTimeout(() => {
      demoLessonQuizGuideAnswerTimerRef.current = null;
      setDemoLessonQuizGuidePhase("answer");
    }, DEMO_IFRAME_LESSON_QUIZ_HINT_TO_ANSWER_DELAY_MS);
  }, [clearDemoLessonQuizGuideAnswerTimer, demoLessonQuizGuidePhase]);

  const handleDemoLessonQuizAnswerSelected = useCallback(() => {
    if (demoLessonQuizGuidePhase !== "answer") return;

    clearDemoLessonQuizGuideAnswerTimer();
    setDemoLessonQuizGuidePhase("submit");
  }, [clearDemoLessonQuizGuideAnswerTimer, demoLessonQuizGuidePhase]);

  const handleDemoLessonQuizSubmitComplete = useCallback(() => {
    if (demoLessonQuizGuidePhase !== "submit") return;

    clearDemoLessonQuizGuideAnswerTimer();
    setDemoLessonQuizGuidePhase("idle");
    setDemoLessonPostVideoLockActive(false);
  }, [clearDemoLessonQuizGuideAnswerTimer, demoLessonQuizGuidePhase]);

  const handleDemoLessonVideoPlay = useCallback(() => {
    if (!demoLessonVideoGuideActive || demoLessonQuizScrollStartedRef.current) return;

    demoLessonQuizScrollStartedRef.current = true;
    clearDemoLessonVideoGuide();
    setDemoLessonPostVideoLockActive(true);

    if (!demoGuideQuizComponentId) {
      setDemoLessonPostVideoLockActive(false);
      return;
    }

    clearDemoLessonQuizScrollTimer();
    clearDemoLessonQuizScrollAnimation();
    demoLessonQuizScrollTimerRef.current = window.setTimeout(() => {
      demoLessonQuizScrollTimerRef.current = null;
      setDemoLessonQuizScrollRequested(true);
    }, DEMO_IFRAME_LESSON_QUIZ_SCROLL_DELAY_MS);
  }, [
    clearDemoLessonQuizScrollAnimation,
    clearDemoLessonQuizScrollTimer,
    clearDemoLessonVideoGuide,
    demoGuideQuizComponentId,
    demoLessonVideoGuideActive,
  ]);

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

  useEffect(() => {
    return () => {
      clearDemoLessonQuizScrollTimer();
      clearDemoLessonQuizAssistTimer();
      clearDemoLessonQuizGuideAnswerTimer();
      clearDemoLessonQuizScrollAnimation();
    };
  }, [
    clearDemoLessonQuizAssistTimer,
    clearDemoLessonQuizGuideAnswerTimer,
    clearDemoLessonQuizScrollAnimation,
    clearDemoLessonQuizScrollTimer,
  ]);

  useEffect(() => {
    clearDemoLessonQuizScrollTimer();
    clearDemoLessonQuizAssistTimer();
    clearDemoLessonQuizGuideAnswerTimer();
    clearDemoLessonQuizScrollAnimation();
    setDemoLessonQuizScrollRequested(false);
    setDemoLessonPostVideoLockActive(false);
    setDemoLessonQuizGuidePhase("idle");
    demoLessonQuizScrollStartedRef.current = false;
  }, [
    clearDemoLessonQuizAssistTimer,
    clearDemoLessonQuizGuideAnswerTimer,
    clearDemoLessonQuizScrollAnimation,
    clearDemoLessonQuizScrollTimer,
    courseId,
    currentLessonId,
    currentUnitIndex,
  ]);

  useEffect(() => {
    if (!isDemoIframe || courseId !== DEMO_IFRAME_EXPLORE_COURSE_ID || !demoLessonVideoGuideKey) {
      clearDemoLessonQuizAssistTimer();
      clearDemoLessonQuizGuideAnswerTimer();
      setDemoLessonVideoGuideActive(false);
      setDemoLessonVideoGuideRect(null);
      setDemoLessonQuizScrollRequested(false);
      setDemoLessonPostVideoLockActive(false);
      setDemoLessonQuizGuidePhase("idle");
      demoLessonQuizScrollStartedRef.current = false;
      return;
    }

    if (isDemoIframeLessonVideoPending(demoLessonVideoGuideKey)) {
      setDemoLessonVideoGuideActive(true);
    }
  }, [
    clearDemoLessonQuizAssistTimer,
    clearDemoLessonQuizGuideAnswerTimer,
    courseId,
    demoLessonVideoGuideKey,
    isDemoIframe,
  ]);

  useEffect(() => {
    if (!isDemoIframe || courseId !== DEMO_IFRAME_EXPLORE_COURSE_ID || !demoGuideQuizComponentId) return;

    const handleDemoLessonQuizGuideStart = () => {
      startDemoLessonQuizGuide();
    };

    window.addEventListener(DEMO_IFRAME_LESSON_QUIZ_GUIDE_EVENT, handleDemoLessonQuizGuideStart);
    return () => {
      window.removeEventListener(DEMO_IFRAME_LESSON_QUIZ_GUIDE_EVENT, handleDemoLessonQuizGuideStart);
    };
  }, [
    courseId,
    demoGuideQuizComponentId,
    isDemoIframe,
    startDemoLessonQuizGuide,
  ]);

  useEffect(() => {
    if (!demoLessonVideoGuideActive || !courseTree?.modules?.length) return;

    const firstModule = courseTree.modules[0];
    const firstLesson = firstModule?.lessons?.[0];
    if (!firstModule || !firstLesson) {
      clearDemoLessonVideoGuide();
      return;
    }

    if (currentLessonId !== firstLesson.id) {
      setCurrentLesson(firstModule.id, firstLesson.id);
      return;
    }

    if (currentUnitIndex !== 0) {
      setUnitIndex(0);
    }
  }, [
    clearDemoLessonVideoGuide,
    courseTree,
    currentLessonId,
    currentUnitIndex,
    demoLessonVideoGuideActive,
    setCurrentLesson,
    setUnitIndex,
  ]);

  useEffect(() => {
    if (!demoLessonVideoGuideActive) {
      setDemoLessonVideoGuideRect(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let hasScrolled = false;
    let cancelGuideScroll: (() => void) | null = null;
    const timers: number[] = [];

    const updateGuideRect = () => {
      if (cancelled) return;

      const target = findDemoLessonVideoElement();
      if (!target || !demoGuideVideoComponentId) {
        attempts += 1;
        setDemoLessonVideoGuideRect(null);
        if (attempts < 36) {
          timers.push(window.setTimeout(updateGuideRect, 125));
        } else {
          clearDemoLessonVideoGuide();
        }
        return;
      }

      if (!hasScrolled) {
        hasScrolled = true;
        cancelGuideScroll = scrollDemoIframeElementToCenter(target, {
          durationMs: DEMO_IFRAME_GUIDE_SCROLL_LONG_MS,
          onUpdate: () => setDemoLessonVideoGuideRect(getDemoLessonVideoGuideRect(target)),
          onComplete: updateGuideRect,
        });
        return;
      }

      setDemoLessonVideoGuideRect(getDemoLessonVideoGuideRect(target));
      attempts += 1;
      if (attempts < 8) {
        timers.push(window.setTimeout(updateGuideRect, 240));
      }
    };

    const handleViewportChange = () => {
      window.requestAnimationFrame(updateGuideRect);
    };

    timers.push(window.setTimeout(updateGuideRect, 120));
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelled = true;
      cancelGuideScroll?.();
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [
    clearDemoLessonVideoGuide,
    demoGuideVideoComponentId,
    demoLessonVideoGuideActive,
  ]);

  useEffect(() => {
    const shouldLock = demoLessonVideoGuideActive || demoLessonPostVideoLockActive || demoLessonQuizGuidePhase !== "idle";
    if (!shouldLock) return;

    setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_LESSON, true);
    return () => {
      setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_LESSON, false);
    };
  }, [demoLessonPostVideoLockActive, demoLessonQuizGuidePhase, demoLessonVideoGuideActive]);

  useEffect(() => {
    const shouldLock = demoLessonVideoGuideActive || demoLessonPostVideoLockActive || demoLessonQuizGuidePhase !== "idle";
    if (!shouldLock) return;

    return lockDemoIframeUserScroll();
  }, [demoLessonPostVideoLockActive, demoLessonQuizGuidePhase, demoLessonVideoGuideActive]);

  useEffect(() => {
    if (!demoLessonQuizScrollRequested) return;

    if (!isDemoIframe || courseId !== DEMO_IFRAME_EXPLORE_COURSE_ID || !demoGuideQuizComponentId) {
      setDemoLessonQuizScrollRequested(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const timers: number[] = [];

    const scrollToQuiz = () => {
      if (cancelled) return;

      const target = findDemoLessonQuizElement();
      if (!target) {
        attempts += 1;
        if (attempts < 36) {
          timers.push(window.setTimeout(scrollToQuiz, 125));
        } else {
          setDemoLessonQuizScrollRequested(false);
          setDemoLessonPostVideoLockActive(false);
        }
        return;
      }

      clearDemoLessonQuizScrollAnimation();
      demoLessonQuizScrollAnimationRef.current = scrollDemoIframeElementToCenter(
        target,
        {
          durationMs: DEMO_IFRAME_LESSON_QUIZ_SCROLL_DURATION_MS,
          onComplete: () => {
            demoLessonQuizScrollAnimationRef.current = null;
            setDemoLessonQuizScrollRequested(false);
            scheduleDemoLessonQuizAssist();
          },
        }
      );
    };

    timers.push(window.setTimeout(scrollToQuiz, 80));

    return () => {
      cancelled = true;
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [
    clearDemoLessonQuizScrollAnimation,
    courseId,
    demoGuideQuizComponentId,
    demoLessonQuizScrollRequested,
    isDemoIframe,
    scheduleDemoLessonQuizAssist,
  ]);

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
      {demoLessonVideoGuideActive && demoLessonVideoGuideRect && typeof document !== "undefined" ? (
        <DemoLessonVideoGuideOverlay rect={demoLessonVideoGuideRect} />
      ) : null}
      {(demoLessonPostVideoLockActive || demoLessonQuizGuidePhase !== "idle") && typeof document !== "undefined" ? (
        <DemoLessonPostVideoInteractionLock />
      ) : null}
      {/* Main Area */}
      <div className="flex flex-1">
        {/* ── Left: Main Content ── */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          <div className="w-full px-6 py-6 md:px-7 md:py-8 2xl:px-8 2xl:py-12">
            {/* Header: Module + Tiêu đề + Progress */}
            <div className="mb-2 md:mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
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
                <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between md:justify-end shrink-0 gap-2 md:gap-0 mt-2 md:mt-0">
                  <div className="text-[14px] md:text-[14px] font-semibold leading-[18px] text-foreground order-1 md:order-2 md:mt-2">
                    Phần đã hoàn thành
                  </div>
                  <div className="text-[20px] md:text-[24px] font-semibold leading-[24px] md:leading-[28px] text-primary tracking-tight order-2 md:order-1">
                    {Math.min(currentUnitIndex + 1, totalUnits)}/{totalUnits}
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
                    const isDemoGuideVideo = demoLessonVideoGuideActive && comp.id === demoGuideVideoComponentId;
                    return (
                      <div
                        key={comp.id}
                        data-demo-lesson-video-guide={isDemoGuideVideo ? "true" : undefined}
                        className={cn(isDemoGuideVideo && "relative z-[99970]")}
                      >
                        <VideoPlayer
                          lesson={lesson}
                          videoUrl={comp.videoUrl}
                          demoGuideActive={isDemoGuideVideo}
                          onDemoGuidePlay={isDemoGuideVideo ? handleDemoLessonVideoPlay : undefined}
                        />
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
                    const isDemoGuideQuiz = isDemoIframe &&
                      courseId === DEMO_IFRAME_EXPLORE_COURSE_ID &&
                      comp.id === demoGuideQuizComponentId;

                    return (
                      <div
                        key={comp.id}
                        data-demo-lesson-quiz-guide={isDemoGuideQuiz ? "true" : undefined}
                      >
                        <QuizContent
                          problemUsageKey={comp.problemUsageKey}
                          problemMedia={comp.problemMedia}
                          onImageClick={(src) => setLightboxSrc(src)}
                          demoGuidePhase={isDemoGuideQuiz ? demoLessonQuizGuidePhase : "idle"}
                          onDemoGuideHintClick={isDemoGuideQuiz ? handleDemoLessonQuizHintClick : undefined}
                          onDemoGuideAnswerSelected={isDemoGuideQuiz ? handleDemoLessonQuizAnswerSelected : undefined}
                          onDemoGuideSubmitComplete={isDemoGuideQuiz ? handleDemoLessonQuizSubmitComplete : undefined}
                        />
                      </div>
                    );
                  }

                  if (comp.type === "la_media_quiz" && comp.mediaQuizUsageKey && comp.mediaQuizData) {
                    return (
                      <MediaQuizContent
                        key={comp.id}
                        usageKey={comp.mediaQuizUsageKey}
                        mediaQuizData={comp.mediaQuizData}
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

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating buttons — Portal to body để thoát khỏi motion.div transform ── */}
      {createPortal(
        <div className="fixed bottom-[85px] md:bottom-8 right-6 md:right-8 z-50 flex flex-col gap-4">
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
      <footer className="border-t border-border/70 bg-background px-4 py-4 text-center">
        <p className="truncate text-[13px] font-medium leading-[18px] text-muted-foreground">
          Copyright © {tenantName}
        </p>
      </footer>

      {courseId && <WelcomeCourseModal courseId={courseId} completionPercent={completionPercent} isLoading={isProgressLoading} config={modalConfig} />}
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

function DemoLessonVideoGuideOverlay({ rect }: { rect: DemoVideoGuideRect }) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const radius = Math.min(16, rect.width / 2, rect.height / 2);
  const blockerClass = "fixed z-[99961] cursor-default bg-transparent";
  const playCenterX = rect.left + rect.width / 2;
  const playCenterY = rect.top + rect.height / 2;
  const bubbleWidth = Math.min(292, Math.max(220, viewportWidth - 32));
  const bubbleLeft = Math.min(
    Math.max(16, playCenterX - bubbleWidth / 2),
    Math.max(16, viewportWidth - bubbleWidth - 16)
  );
  const bubbleTop = Math.min(
    Math.max(18, playCenterY + 56),
    Math.max(18, viewportHeight - 86)
  );
  const bubbleTailLeft = Math.min(Math.max(28, playCenterX - bubbleLeft), bubbleWidth - 28);
  const bubbleConnectorHeight = Math.max(16, bubbleTop - playCenterY - 10);

  return createPortal(
    <>
      <svg
        className="pointer-events-none fixed inset-0 z-[99960] h-screen w-screen"
        width={viewportWidth}
        height={viewportHeight}
        viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
        aria-hidden="true"
      >
        <defs>
          <mask id="demo-lesson-video-guide-mask">
            <rect width={viewportWidth} height={viewportHeight} fill="white" />
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              rx={radius}
              ry={radius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width={viewportWidth}
          height={viewportHeight}
          className="demo-iframe-dark-mask-fill"
          mask="url(#demo-lesson-video-guide-mask)"
        />
      </svg>
      <div
        className={blockerClass}
        style={{ left: 0, right: 0, top: 0, height: rect.top }}
        aria-hidden="true"
      />
      <div
        className={blockerClass}
        style={{ left: 0, right: 0, top: rect.bottom, bottom: 0 }}
        aria-hidden="true"
      />
      <div
        className={blockerClass}
        style={{ left: 0, top: rect.top, width: rect.left, height: rect.height }}
        aria-hidden="true"
      />
      <div
        className={blockerClass}
        style={{ left: rect.right, right: 0, top: rect.top, height: rect.height }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed z-[99972]"
        style={{ left: bubbleLeft, top: bubbleTop, width: bubbleWidth }}
        aria-hidden="true"
      >
        <div
          className="absolute bottom-full w-px bg-white/85 shadow-[0_0_12px_rgba(255,255,255,0.75)]"
          style={{ left: bubbleTailLeft, height: bubbleConnectorHeight }}
        />
        <div
          className="absolute h-2.5 w-2.5 rounded-full border border-white bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]"
          style={{ left: bubbleTailLeft - 5, bottom: `calc(100% + ${bubbleConnectorHeight - 1}px)` }}
        />
        <div className="demo-iframe-play-bubble rounded-2xl border border-white/80 bg-white px-4 py-3 text-center text-[14px] font-semibold leading-[18px] text-slate-900 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          Nhấn play để bắt đầu bài học
        </div>
      </div>
    </>,
    document.body
  );
}

function DemoLessonPostVideoInteractionLock() {
  return createPortal(
    <div
      className="fixed inset-0 z-[99980] cursor-default bg-transparent"
      aria-hidden="true"
    />,
    document.body
  );
}
