// ============================================================
// ExplorePage — Khám phá khóa học (dữ liệu thật từ Open edX)
// Grouped by category, filter theo trạng thái học
// ============================================================

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { storageUrl } from "@/utils/storageUrl";
import { Search, Loader2, BookOpen, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeStore } from "@/stores/useThemeStore";
import { useSearchStore } from "@/stores/useSearchStore";
import { cn } from "@/lib/utils";
import { useCourse, useCourses, useMyEnrollments, useCoursesByCategory } from "@/hooks/useCourses";
import { useCourseCompletion, useBatchCourseProgress } from "@/hooks/useProgress";

import heroIllustration from "@/assets/ExplorePage/KhamPhaHanhTrinhHocTapCuaToi.png.png";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";
import { useBranding } from "@/hooks/useBranding";
import { ConfirmEnrollModal } from "@/components/explore/ConfirmEnrollModal";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  clearDemoIframeExploreCoursePending,
  DEMO_IFRAME_EXPLORE_COURSE_EVENT,
  DEMO_IFRAME_EXPLORE_COURSE_ID,
  demoIframeExploreCourseKey,
  demoIframeLessonVideoKey,
  isDemoIframeExploreCoursePending,
  markDemoIframeLessonVideoPending,
  setDemoIframeFlowLock,
} from "@/utils/demoIframeDashboardGuide";
import { lockDemoIframeUserScroll } from "@/utils/demoIframeGuideLock";
import {
  DEMO_IFRAME_GUIDE_SCROLL_LONG_MS,
  scrollDemoIframeElementToCenter,
} from "@/utils/demoIframeSmoothScroll";

// Filter types cho detail view
type DetailFilter = 'all' | 'in_progress' | 'completed' | 'not_enrolled';
const DEMO_IFRAME_FLOW_LOCK_EXPLORE = "explore-course";
type DemoCourseGuideRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

function findCourseFocusElement(courseId: string): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("[data-explore-focus-course]")
  ).filter(element => element.dataset.exploreFocusCourse === courseId);

  return candidates.find(element => element.getClientRects().length > 0) || candidates[0] || null;
}

function getDemoCourseGuideRect(element: HTMLElement, padding = 0): DemoCourseGuideRect {
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

export function ExplorePage() {
  const { colorStyle } = useThemeStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusCourseId = searchParams.get("focus_course")?.trim() || "";
  const handledFocusRef = useRef<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [highlightCourseId, setHighlightCourseId] = useState<string | null>(null);
  const [demoCourseGuideActive, setDemoCourseGuideActive] = useState(false);
  const [demoCourseGuideRect, setDemoCourseGuideRect] = useState<DemoCourseGuideRect | null>(null);
  const [demoConfirmEnrollGuideActive, setDemoConfirmEnrollGuideActive] = useState(false);
  const [pendingConfirmCourse, setPendingConfirmCourse] = useState<any | null>(null);
  const { data: courseData, isLoading } = useCourses(debouncedSearch || undefined);
  const { data: focusCourseDetail } = useCourse(focusCourseId);
  const { data: enrollments } = useMyEnrollments();
  const sessionMode = useAuthStore((s) => s.sessionMode);
  const userId = useAuthStore((s) => s.user?.id);
  const loginSessionId = useAuthStore((s) => s.loginSessionId);
  const isDemoIframe = sessionMode === "demo_iframe";
  const demoExploreCourseGuideKey = useMemo(
    () => demoIframeExploreCourseKey(userId, loginSessionId),
    [loginSessionId, userId]
  );
  const demoLessonVideoGuideKey = useMemo(
    () => demoIframeLessonVideoKey(userId, loginSessionId),
    [loginSessionId, userId]
  );

  // Dynamic explore hero card content
  const { branding } = useBranding();
  const configuredExploreBadge = branding.dashboardContent?.explore_hero_badge?.trim();
  const exploreBadge = !configuredExploreBadge || configuredExploreBadge.toLowerCase() === 'course'
    ? 'Khoá học'
    : configuredExploreBadge;
  const exploreTitle = branding.dashboardContent?.explore_hero_title || 'Khám phá hành trình học tập của tôi';

  // State cho bộ filter trạng thái học (hiển thị mặc định)
  const [detailFilter, setDetailFilter] = useState<DetailFilter>('all');

  // State cho category detail view
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<{ id: string; name: string } | null>(null);
  const [categoryDetailPage, setCategoryDetailPage] = useState(1);
  const CATEGORY_DETAIL_PAGE_SIZE = 12;

  // Fetch courses cho category detail view
  const { data: categoryDetailData, isLoading: categoryDetailLoading } = useCoursesByCategory(
    selectedCategoryDetail?.id,
    { search: debouncedSearch || undefined, page: categoryDetailPage, page_size: CATEGORY_DETAIL_PAGE_SIZE },
  );

  // State cho right panel filter danh mục (multi-select)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  // Click outside để đóng dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target as Node)) {
        setMobileFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Set enrolled IDs cho lookup nhanh
  const enrolledIds = new Set(
    (enrollments || []).map((e) => e.course_id)
  );

  const allCourses = courseData?.data || [];
  const categories = courseData?.categories || [];
  const focusCourseFromList = focusCourseId
    ? allCourses.find(course => course.id === focusCourseId)
    : undefined;
  const focusCourse = focusCourseFromList || focusCourseDetail;

  // Batch progress cho tất cả enrolled courses
  const enrolledCourseIds = useMemo(
    () => allCourses.filter(c => enrolledIds.has(c.id)).map(c => c.id),
    [allCourses, enrolledIds]
  );
  const { data: progressMap } = useBatchCourseProgress(enrolledCourseIds);

  const courseDetailPath = (courseId: string) => `/courses/${encodeURIComponent(courseId)}/lessons/overview`;

  const openEnrollConfirm = (course: any) => {
    setPendingConfirmCourse(course);
  };

  const handleConfirmStartCourse = () => {
    if (!pendingConfirmCourse?.id) return;
    const targetPath = courseDetailPath(pendingConfirmCourse.id);
    if (
      isDemoIframe
      && demoConfirmEnrollGuideActive
      && pendingConfirmCourse.id === DEMO_IFRAME_EXPLORE_COURSE_ID
      && demoLessonVideoGuideKey
    ) {
      markDemoIframeLessonVideoPending(demoLessonVideoGuideKey);
    }
    setDemoConfirmEnrollGuideActive(false);
    setPendingConfirmCourse(null);
    navigate(targetPath);
  };

  const clearDemoCourseGuide = () => {
    if (demoExploreCourseGuideKey) {
      clearDemoIframeExploreCoursePending(demoExploreCourseGuideKey);
    }
    setDemoCourseGuideActive(false);
    setDemoCourseGuideRect(null);
  };

  const handleDemoCourseGuideCourseClick = (course: any, courseIsEnrolled: boolean) => {
    if (!isDemoIframe || course?.id !== DEMO_IFRAME_EXPLORE_COURSE_ID) return;
    clearDemoCourseGuide();
    if (!courseIsEnrolled) {
      setDemoConfirmEnrollGuideActive(true);
    }
  };

  // Group courses by category
  const coursesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; courses: typeof allCourses }>();
    for (const cat of categories) {
      const catCourses = allCourses.filter(c =>
        c.categories?.some((cc: any) => cc.id === cat.id)
      );
      if (catCourses.length > 0) {
        map.set(cat.id, { name: cat.name, courses: catCourses });
      }
    }
    // Courses không thuộc category nào
    const uncategorized = allCourses.filter(
      c => !c.categories || c.categories.length === 0
    );
    if (uncategorized.length > 0) {
      map.set('__uncategorized__', { name: "Khóa học khác", courses: uncategorized });
    }
    return map;
  }, [categories, allCourses]);


  // Helper: filter 1 mảng courses theo detailFilter
  const applyStatusFilter = (courses: typeof allCourses) => {
    if (detailFilter === 'in_progress') {
      return courses.filter(c =>
        enrolledIds.has(c.id) && (progressMap?.get(c.id) || 0) < 100
      );
    } else if (detailFilter === 'completed') {
      return courses.filter(c =>
        enrolledIds.has(c.id) && (progressMap?.get(c.id) || 0) >= 100
      );
    } else if (detailFilter === 'not_enrolled') {
      return courses.filter(c => !enrolledIds.has(c.id));
    }
    return courses;
  };

  // Xử lý search hero với debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 500);
  };

  const globalSearchTerm = useSearchStore(s => s.globalSearchTerm);
  const setGlobalSearchTerm = useSearchStore(s => s.setGlobalSearchTerm);
  useEffect(() => {
    if (globalSearchTerm !== searchTerm) {
      handleSearchChange(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    if (!focusCourseId || handledFocusRef.current === focusCourseId) return;

    handledFocusRef.current = focusCourseId;
    setGlobalSearchTerm("");
    setSearchTerm("");
    setDebouncedSearch("");
    setDetailFilter("all");
    setSelectedCategoryIds(new Set());
    setSelectedCategoryDetail(null);
    setCategoryDetailPage(1);
    setMobileFilterOpen(false);
    setCategoryDropdownOpen(false);
    setHighlightCourseId(focusCourseId);

    const timer = window.setTimeout(() => {
      setHighlightCourseId((current) => (current === focusCourseId ? null : current));
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [focusCourseId, setGlobalSearchTerm]);

  useEffect(() => {
    if (!focusCourseId || !focusCourse || isLoading || selectedCategoryDetail) return;

    let cancelled = false;
    let attempts = 0;
    let hasScrolled = false;
    let cancelGuideScroll: (() => void) | null = null;
    const timers: number[] = [];

    const scrollToFocusedCourse = () => {
      if (cancelled) return;

      const target = findCourseFocusElement(focusCourseId);
      if (target && !hasScrolled) {
        cancelGuideScroll = scrollDemoIframeElementToCenter(target, {
          durationMs: DEMO_IFRAME_GUIDE_SCROLL_LONG_MS,
        });
        hasScrolled = true;
      }

      attempts += 1;
      if (attempts < (target ? 6 : 24)) {
        timers.push(window.setTimeout(scrollToFocusedCourse, target ? 350 : 125));
      }
    };

    timers.push(window.setTimeout(scrollToFocusedCourse, 80));

    return () => {
      cancelled = true;
      cancelGuideScroll?.();
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [focusCourseId, focusCourse, isLoading, selectedCategoryDetail]);

  useEffect(() => {
    if (!isDemoIframe || !demoExploreCourseGuideKey) {
      setDemoCourseGuideActive(false);
      setDemoCourseGuideRect(null);
      return;
    }

    if (
      focusCourseId === DEMO_IFRAME_EXPLORE_COURSE_ID
      && isDemoIframeExploreCoursePending(demoExploreCourseGuideKey)
    ) {
      setDemoCourseGuideActive(true);
    }

    const handleExploreCourseGuideStart = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; courseId?: string }>).detail;
      if (detail?.key && detail.key !== demoExploreCourseGuideKey) return;
      if (detail?.courseId && detail.courseId !== DEMO_IFRAME_EXPLORE_COURSE_ID) return;
      if (focusCourseId !== DEMO_IFRAME_EXPLORE_COURSE_ID) return;
      setDemoCourseGuideActive(true);
    };

    window.addEventListener(DEMO_IFRAME_EXPLORE_COURSE_EVENT, handleExploreCourseGuideStart);
    return () => {
      window.removeEventListener(DEMO_IFRAME_EXPLORE_COURSE_EVENT, handleExploreCourseGuideStart);
    };
  }, [demoExploreCourseGuideKey, focusCourseId, isDemoIframe]);

  useEffect(() => {
    if (!demoCourseGuideActive) {
      setDemoCourseGuideRect(null);
      return;
    }

    if (focusCourseId !== DEMO_IFRAME_EXPLORE_COURSE_ID) {
      clearDemoCourseGuide();
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let hasScrolled = false;
    let cancelGuideScroll: (() => void) | null = null;
    const timers: number[] = [];

    const updateGuideRect = () => {
      if (cancelled) return;

      const target = findCourseFocusElement(DEMO_IFRAME_EXPLORE_COURSE_ID);
      if (!target) {
        attempts += 1;
        setDemoCourseGuideRect(null);
        if (attempts < 30) {
          timers.push(window.setTimeout(updateGuideRect, 125));
        } else {
          clearDemoCourseGuide();
        }
        return;
      }

      if (!hasScrolled) {
        hasScrolled = true;
        cancelGuideScroll = scrollDemoIframeElementToCenter(target, {
          durationMs: DEMO_IFRAME_GUIDE_SCROLL_LONG_MS,
          onUpdate: () => setDemoCourseGuideRect(getDemoCourseGuideRect(target)),
          onComplete: updateGuideRect,
        });
        return;
      }

      setDemoCourseGuideRect(getDemoCourseGuideRect(target));
      attempts += 1;
      if (attempts < 8) {
        timers.push(window.setTimeout(updateGuideRect, 240));
      }
    };

    const handleViewportChange = () => {
      window.requestAnimationFrame(updateGuideRect);
    };

    timers.push(window.setTimeout(updateGuideRect, 80));
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelled = true;
      cancelGuideScroll?.();
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [demoCourseGuideActive, focusCourseId]);

  useEffect(() => {
    const shouldLock = demoCourseGuideActive || demoConfirmEnrollGuideActive;
    if (!shouldLock) return;

    return lockDemoIframeUserScroll();
  }, [demoConfirmEnrollGuideActive, demoCourseGuideActive]);

  useEffect(() => {
    const shouldLock = demoCourseGuideActive || demoConfirmEnrollGuideActive;
    if (!shouldLock) return;

    setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_EXPLORE, true);
    return () => {
      setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_EXPLORE, false);
    };
  }, [demoConfirmEnrollGuideActive, demoCourseGuideActive]);



  // Right panel click: toggle danh mục trong filter
  const handleCategoryClick = (catId: string | 'all') => {
    if (catId === 'all') {
      setSelectedCategoryIds(new Set());
      return;
    }
    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // Lọc danh mục hiển thị theo right panel (multi-select)
  const visibleCategories = useMemo(() => {
    const entries = Array.from(coursesByCategory.entries());
    if (selectedCategoryIds.size === 0) return entries;
    return entries.filter(([id]) => selectedCategoryIds.has(id));
  }, [coursesByCategory, selectedCategoryIds]);

  const focusCourseVisibleInCategorySections = Boolean(
    focusCourseId && visibleCategories.some(([, { courses }]) =>
      applyStatusFilter(courses).some(course => course.id === focusCourseId)
    )
  );
  const shouldRenderStandaloneFocusCourse = Boolean(
    focusCourseId && focusCourse && !focusCourseVisibleInCategorySections && !selectedCategoryDetail
  );

  const limitCoursesForDisplay = (courses: typeof allCourses, limit: number) => {
    const limited = courses.slice(0, limit);
    if (!focusCourseId || limited.some(course => course.id === focusCourseId)) {
      return limited;
    }

    const focused = courses.find(course => course.id === focusCourseId);
    if (!focused) return limited;

    return [focused, ...limited].slice(0, limit);
  };



  return (
    <>
    {demoCourseGuideActive && demoCourseGuideRect && typeof document !== "undefined" ? (
      <DemoExploreCourseGuideOverlay rect={demoCourseGuideRect} />
    ) : null}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-[1420px] px-4 pb-8 md:px-8 xl:px-10"
    >
      <div className="flex flex-col lg:flex-row w-full">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-full lg:w-[280px] shrink-0 lg:border-r lg:border-border lg:pr-8 pt-4 lg:pt-8 mb-6 lg:mb-0">
          <div className="sticky top-24 space-y-10 self-start pb-8">
            <UserProfileCard />
            <BadgeShowcase />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:pl-8 mt-2 lg:mt-0 pt-2 lg:pt-8">
          <AnimatePresence mode="wait">
              /* ══════════════ OVERVIEW — Grouped by category ══════════════ */
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Section — 2 panel layout */}
              <div className="mb-8 flex flex-col lg:flex-row gap-6 w-full items-stretch">
                {/* Left Panel — Hero */}
                <div
                  className="relative flex-1 rounded-[20px] md:rounded-[32px] p-5 pb-3 md:p-6 flex flex-col justify-between min-h-[240px] md:min-h-[250px] lg:h-[270px]"
                >
                  {/* Background container that clips */}
                  <div className="absolute inset-0 rounded-[20px] md:rounded-[32px] overflow-hidden z-0 pointer-events-none" style={{ border: '1.5px solid hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.04)' }}>
                    {/* Illustration */}
                    <img
                      src={heroIllustration}
                      alt="Khám phá hành trình học tập"
                      className="hidden md:block absolute right-0 bottom-0 h-full w-auto max-w-[400px] object-contain select-none pr-3 mr-20"
                    />
                  </div>

                  <div className="relative z-10 flex flex-col flex-1 w-full justify-between pointer-events-auto">
                    <div>
                      {/* Badge COURSE */}
                      <div
                        className="mb-3 inline-flex w-fit whitespace-nowrap items-center justify-center h-[23px] rounded-[41px] px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                        style={{ backgroundColor: "#43FDD7", color: "#000" }}
                      >
                        {exploreBadge}
                      </div>

                      {/* Title */}
                      <h1 className="mb-4 max-w-[320px] text-[24px] lg:text-[26px] font-bold leading-[32px] text-foreground">
                        {exploreTitle}
                      </h1>
                    </div>

                    <div className="mt-auto flex flex-col gap-3">
                      {/* Search bar (PC) */}
                      <div className="hidden md:flex w-full max-w-[340px] items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2.5 shadow-sm">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm khoá học..."
                          className="flex-1 bg-transparent text-[14px] font-normal leading-[18px] text-foreground placeholder-muted-foreground/60 outline-none"
                        />
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Mobile Filter Button */}
                      <div className="md:hidden w-full relative z-20" ref={mobileFilterRef}>
                        <button
                          onClick={() => setMobileFilterOpen(prev => !prev)}
                          className={cn(
                            "flex items-center justify-center gap-2 w-fit px-4 py-2 rounded-full text-[13px] font-medium border transition-all shadow-sm",
                            (selectedCategoryIds.size > 0 || detailFilter !== 'all')
                              ? "border-primary text-primary bg-primary/5"
                              : "border-border bg-card text-foreground hover:border-primary/40"
                          )}
                        >
                          <Filter className="w-4 h-4" />
                          Bộ lọc
                          {(selectedCategoryIds.size > 0 || detailFilter !== 'all') && (
                            <span className="flex items-center justify-center h-[18px] min-w-[18px] rounded-full bg-primary text-white text-[11px] font-bold px-1 ml-0.5">
                              {(selectedCategoryIds.size > 0 ? 1 : 0) + (detailFilter !== 'all' ? 1 : 0)}
                            </span>
                          )}
                          <ChevronDown className={cn("h-4 w-4 transition-transform ml-0.5", mobileFilterOpen && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {mobileFilterOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.97 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 top-[calc(100%+8px)] z-30 w-[280px] rounded-2xl border border-border bg-card p-4 shadow-xl flex flex-col gap-5 max-h-[60vh] overflow-y-auto scrollbar-thin"
                            >
                              {/* Trạng thái học */}
                              <div className="flex flex-col gap-2.5">
                                <h4 className="text-[14px] font-bold text-foreground">Trạng thái học</h4>
                                <div className="flex flex-wrap gap-2">
                                  {([
                                    { key: 'all' as DetailFilter, label: 'Tất cả' },
                                    { key: 'in_progress' as DetailFilter, label: 'Đang học' },
                                    { key: 'completed' as DetailFilter, label: 'Đã học' },
                                    { key: 'not_enrolled' as DetailFilter, label: 'Chưa học' },
                                  ]).map(pill => (
                                    <button
                                      key={pill.key}
                                      onClick={() => setDetailFilter(pill.key)}
                                      className={cn(
                                        "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all",
                                        detailFilter === pill.key
                                          ? "bg-primary text-white border-primary"
                                          : "bg-background text-muted-foreground border-border"
                                      )}
                                    >
                                      {pill.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="h-px bg-border w-full" />

                              {/* Danh mục */}
                              <div className="flex flex-col gap-2">
                                <h4 className="text-[14px] font-bold text-foreground mb-1">Danh mục</h4>
                                <button
                                  onClick={() => handleCategoryClick('all')}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left",
                                    selectedCategoryIds.size === 0
                                      ? "bg-primary/10 text-primary"
                                      : "text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  <div className={cn(
                                    "flex items-center justify-center h-4 w-4 rounded border-[1.5px] shrink-0 transition-colors",
                                    selectedCategoryIds.size === 0
                                      ? "border-primary bg-primary"
                                      : "border-muted-foreground/40"
                                  )}>
                                    {selectedCategoryIds.size === 0 && <Check className="h-3 w-3 text-white stroke-[3]" />}
                                  </div>
                                  Tất cả danh mục
                                </button>
                                
                                <div className="flex flex-col gap-0.5 mt-1">
                                  {categories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => handleCategoryClick(cat.id)}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left",
                                        selectedCategoryIds.has(cat.id)
                                          ? "bg-primary/10 text-primary"
                                          : "text-foreground hover:bg-muted/50"
                                      )}
                                    >
                                      <div className={cn(
                                        "flex items-center justify-center h-4 w-4 rounded border-[1.5px] shrink-0 transition-colors",
                                        selectedCategoryIds.has(cat.id)
                                          ? "border-primary bg-primary"
                                          : "border-muted-foreground/40"
                                      )}>
                                        {selectedCategoryIds.has(cat.id) && <Check className="h-3 w-3 text-white stroke-[3]" />}
                                      </div>
                                      {cat.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel — Bộ lọc khoá học (commented out, replaced by dropdown below) */}
                {/* <div
                    className="w-full lg:w-[320px] shrink-0 rounded-[32px] bg-card p-6 flex flex-col lg:h-[270px]"
                    style={{ border: '1.5px solid hsl(var(--primary))' }}
                  >
                    <h3 className="text-[18px] font-bold leading-[24px] text-foreground mb-0.5">
                      Bộ lọc danh mục khoá học
                    </h3>
                    <p className="text-[13px] text-muted-foreground mb-4">
                      Có thể chọn nhiều danh mục
                    </p>

                    <div className="flex flex-col gap-2.5 h-[140px] lg:h-auto lg:flex-1 overflow-y-auto overflow-x-hidden pr-3 min-h-0 scrollbar-thin">
                      <button
                        onClick={() => handleCategoryClick('all')}
                        className={cn(
                          "w-full rounded-full border px-4 py-2.5 text-[13px] font-semibold text-center transition-all",
                          selectedCategoryIds.size === 0
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-primary/50 bg-background text-foreground hover:bg-primary/5"
                        )}
                      >
                        Tất cả danh mục
                      </button>

                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat.id)}
                          className={cn(
                            "w-full rounded-full border px-4 py-2.5 text-[13px] font-semibold text-center transition-all",
                            selectedCategoryIds.has(cat.id)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-primary/50 bg-background text-foreground hover:bg-primary/5"
                          )}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div> */}
              </div>

              {/* Bộ lọc trạng thái học + dropdown danh mục (Chỉ hiển thị trên PC) */}
              <div className="relative z-10 hidden md:flex items-center justify-between gap-3 mb-6 flex-wrap">
                {/* Left — Filter pills */}
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'all' as DetailFilter, label: 'Tất cả' },
                    { key: 'in_progress' as DetailFilter, label: 'Đang học' },
                    { key: 'completed' as DetailFilter, label: 'Đã học' },
                    { key: 'not_enrolled' as DetailFilter, label: 'Chưa học' },
                  ]).map(pill => (
                    <button
                      key={pill.key}
                      onClick={() => setDetailFilter(pill.key)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all",
                        detailFilter === pill.key
                          ? "bg-primary text-white border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Right — Category dropdown */}
                <div className="relative z-20" ref={dropdownRef}>
                  <button
                    onClick={() => setCategoryDropdownOpen(prev => !prev)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all",
                      selectedCategoryIds.size > 0
                        ? "bg-primary/10 text-primary border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    Danh mục
                    {selectedCategoryIds.size > 0 && (
                      <span className="flex items-center justify-center h-[18px] min-w-[18px] rounded-full bg-primary text-white text-[11px] font-bold px-1">
                        {selectedCategoryIds.size}
                      </span>
                    )}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", categoryDropdownOpen && "rotate-180")} />
                  </button>

                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {categoryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-30 w-[240px] rounded-2xl border border-border bg-card p-2 shadow-xl"
                      >
                        {/* Tất cả danh mục — clear */}
                        <button
                          onClick={() => handleCategoryClick('all')}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left",
                            selectedCategoryIds.size === 0
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center h-4 w-4 rounded border-[1.5px] shrink-0 transition-colors",
                            selectedCategoryIds.size === 0
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          )}>
                            {selectedCategoryIds.size === 0 && <Check className="h-3 w-3 text-white stroke-[3]" />}
                          </div>
                          Tất cả danh mục
                        </button>

                        <div className="h-px bg-border my-1" />

                        {/* Danh mục items */}
                        <div className="max-h-[240px] overflow-y-auto space-y-0.5 scrollbar-thin">
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => handleCategoryClick(cat.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left",
                                selectedCategoryIds.has(cat.id)
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-muted/50"
                              )}
                            >
                              <div className={cn(
                                "flex items-center justify-center h-4 w-4 rounded border-[1.5px] shrink-0 transition-colors",
                                selectedCategoryIds.has(cat.id)
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40"
                              )}>
                                {selectedCategoryIds.has(cat.id) && <Check className="h-3 w-3 text-white stroke-[3]" />}
                              </div>
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Loading state */}
              {isLoading && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="h-full flex flex-col overflow-hidden rounded-3xl border-border shadow-sm">
                      <Skeleton className="h-48 w-full rounded-none" />
                      <CardContent className="p-5 flex flex-col flex-1">
                        <div className="flex gap-2 mb-3">
                          <Skeleton className="h-5 w-20 rounded-full" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-6 w-3/4 mb-3" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="mt-auto pt-4 flex items-center justify-between">
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty state — API trả rỗng hoặc filter danh mục không có kết quả */}
              {!isLoading && !shouldRenderStandaloneFocusCourse && (allCourses.length === 0 || visibleCategories.length === 0) && (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <BookOpen className="h-10 w-10 text-primary/40" />
                  </div>
                  <h3 className="mb-2 text-[20px] font-bold leading-[24px] text-foreground">
                    {debouncedSearch ? "Không tìm thấy khóa học" : "Chưa có khóa học nào"}
                  </h3>
                  <p className="text-[14px] font-normal leading-[18px] text-muted-foreground max-w-md mx-auto">
                    {debouncedSearch
                      ? `Không có khóa học nào phù hợp với "${debouncedSearch}". Hãy thử từ khóa khác.`
                      : "Hệ thống chưa có khóa học nào. Vui lòng quay lại sau."}
                  </p>
                </div>
              )}

              {/* Empty state — filter trạng thái học không có kết quả */}
              {!isLoading && allCourses.length > 0 && visibleCategories.length > 0
                && detailFilter !== 'all'
                && visibleCategories.every(([, { courses }]) => applyStatusFilter(courses).length === 0)
                && (
                  <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      <BookOpen className="h-10 w-10 text-primary/40" />
                    </div>
                    <h3 className="mb-2 text-[18px] font-bold text-foreground">
                      Không tìm thấy khóa học
                    </h3>
                    <p className="text-[14px] text-muted-foreground">
                      Không có khóa học nào phù hợp với bộ lọc hiện tại.
                    </p>
                  </div>
                )}

              {/* Category sections — giới hạn số card, có nút Xem tất cả */}
              {!isLoading && shouldRenderStandaloneFocusCourse && focusCourse && (
                <section className="mb-10 scroll-mt-24">
                  <div className="mb-5 flex items-baseline gap-2">
                    <h2 className="text-[22px] font-bold leading-[28px] text-foreground">
                      Khóa học từ email
                    </h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 md:gap-x-6 md:gap-y-10 lg:grid-cols-3">
                    <div data-explore-focus-course={focusCourse.id} className="flex scroll-mt-24">
                      <ExploreCourseCard
                        course={focusCourse}
                        isEnrolled={enrolledIds.has(focusCourse.id)}
                        colorStyle={colorStyle}
                        categoryName={focusCourse.categories?.[0]?.name || "Khóa học"}
                        isHighlighted={highlightCourseId === focusCourse.id}
                        isDemoGuideActive={demoCourseGuideActive && focusCourse.id === DEMO_IFRAME_EXPLORE_COURSE_ID}
                        onRequireConfirm={openEnrollConfirm}
                        onCourseClick={handleDemoCourseGuideCourseClick}
                      />
                    </div>
                  </div>
                </section>
              )}

              {!isLoading && allCourses.length > 0 && !selectedCategoryDetail && (
                <div className="relative z-0 space-y-10">
                  {visibleCategories.map(([catId, { name, courses: catCourses }]) => {
                    const displayCourses = applyStatusFilter(catCourses);

                    // Ẩn category nếu filter ra 0 kết quả
                    if (displayCourses.length === 0) return null;

                    // Mobile: 4 cards, PC: 6 cards
                    const mobileLimit = 4;
                    const pcLimit = 6;
                    const hasMoreMobile = displayCourses.length > mobileLimit;
                    const hasMorePC = displayCourses.length > pcLimit;
                    // PC lấy 6, mobile lấy 4 (dùng CSS ẩn/hiện)
                    const pcCourses = limitCoursesForDisplay(displayCourses, pcLimit);
                    const mobileCourses = limitCoursesForDisplay(displayCourses, mobileLimit);

                    return (
                      <section key={catId} id={`category-section-${catId}`} className="scroll-mt-6">
                        {/* Category header */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-baseline gap-2">
                            <h2 className="text-[22px] font-bold leading-[28px] text-foreground">
                              {name}
                            </h2>
                            <span className="text-[13px] text-muted-foreground">
                              ({displayCourses.length} khóa học)
                            </span>
                          </div>
                          {/* Nút Xem tất cả — mobile */}
                          {hasMoreMobile && (
                            <button
                              onClick={() => {
                                setSelectedCategoryDetail({ id: catId, name });
                                setCategoryDetailPage(1);
                              }}
                              className="md:hidden flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              Xem tất cả
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* Nút Xem tất cả — PC */}
                          {hasMorePC && (
                            <button
                              onClick={() => {
                                setSelectedCategoryDetail({ id: catId, name });
                                setCategoryDetailPage(1);
                              }}
                              className="hidden md:flex items-center gap-1 text-[14px] font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              Xem tất cả
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Mobile carousel — 4 cards */}
                        <div className="flex items-stretch overflow-x-auto snap-x snap-mandatory gap-4 pb-4 pl-2 -mr-4 md:hidden hide-scrollbar">
                          {mobileCourses.map((course) => (
                            <div
                              key={course.id}
                              data-explore-focus-course={course.id === focusCourseId ? course.id : undefined}
                              className="w-[85vw] max-w-[300px] shrink-0 snap-start flex scroll-mt-24"
                            >
                              <ExploreCourseCard
                                course={course}
                                isEnrolled={enrolledIds.has(course.id)}
                                colorStyle={colorStyle}
                                categoryName={name}
                                isHighlighted={highlightCourseId === course.id}
                                isDemoGuideActive={demoCourseGuideActive && course.id === DEMO_IFRAME_EXPLORE_COURSE_ID}
                                onRequireConfirm={openEnrollConfirm}
                                onCourseClick={handleDemoCourseGuideCourseClick}
                              />
                            </div>
                          ))}
                        </div>

                        {/* PC grid — 6 cards */}
                        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-6 md:gap-y-10">
                          {pcCourses.map((course) => (
                            <div
                              key={course.id}
                              data-explore-focus-course={course.id === focusCourseId ? course.id : undefined}
                              className="flex scroll-mt-24"
                            >
                              <ExploreCourseCard
                                course={course}
                                isEnrolled={enrolledIds.has(course.id)}
                                colorStyle={colorStyle}
                                categoryName={name}
                                isHighlighted={highlightCourseId === course.id}
                                isDemoGuideActive={demoCourseGuideActive && course.id === DEMO_IFRAME_EXPLORE_COURSE_ID}
                                onRequireConfirm={openEnrollConfirm}
                                onCourseClick={handleDemoCourseGuideCourseClick}
                              />
                            </div>
                          ))}
                        </div>

                      </section>
                    );
                  })}
                </div>
              )}

              {/* ══════════════ CATEGORY DETAIL VIEW ══════════════ */}
              {selectedCategoryDetail && (
                <div className="relative z-0">
                  {/* Back button */}
                  <button
                    onClick={() => {
                      setSelectedCategoryDetail(null);
                      setCategoryDetailPage(1);
                    }}
                    className="flex items-center gap-2 mb-6 text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại
                  </button>

                  {/* Category title */}
                  <div className="flex items-baseline gap-2 mb-6">
                    <h2 className="text-[24px] font-bold leading-[30px] text-foreground">
                      {selectedCategoryDetail.name}
                    </h2>
                    {categoryDetailData && (
                      <span className="text-[13px] text-muted-foreground">
                        ({categoryDetailData.total} khóa học)
                      </span>
                    )}
                  </div>

                  {/* Loading */}
                  {categoryDetailLoading && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="h-[400px] flex flex-col overflow-hidden rounded-[28px] border-border shadow-sm">
                          <Skeleton className="h-48 w-full rounded-none" />
                          <div className="p-5 flex flex-col flex-1">
                            <Skeleton className="h-4 w-20 mb-3 rounded-full" />
                            <Skeleton className="h-6 w-3/4 mb-3" />
                            <Skeleton className="h-4 w-full mb-2" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Course grid */}
                  {!categoryDetailLoading && categoryDetailData && (
                    <>
                      {/* Mobile — danh sách dọc, card ngang giống dashboard PC */}
                      <div className="flex flex-col gap-4 md:hidden px-2">
                        {(categoryDetailData.data || []).map((course: any) => {
                          const imageUrl = course.image_url
                            ? storageUrl(course.image_url)
                            : null;
                          const isEnrolled = enrolledIds.has(course.id);
                          const completionPercent = isEnrolled ? (progressMap?.get(course.id) ?? 0) : 0;
                          const displayPercent = Math.floor(Math.round(completionPercent * 100) / 10 + 0.4) / 10;

                          return (
                            <Link
                              key={course.id}
                              to={courseDetailPath(course.id)}
                              onClick={(event) => {
                                if (!isEnrolled) {
                                  event.preventDefault();
                                  openEnrollConfirm(course);
                                }
                              }}
                              className="flex w-full"
                            >
                              <div className="group flex flex-row flex-1 w-full h-[150px] overflow-hidden rounded-2xl border-[1.5px] border-primary/55 bg-card shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-primary/80 hover:shadow-md hover:scale-[1.02]">
                                {/* Thumbnail */}
                                <div className="w-[38%] h-full shrink-0 relative flex items-center justify-center overflow-hidden p-1.5">
                                  {imageUrl ? (
                                    <>
                                      <img
                                        src={imageUrl}
                                        alt={course.display_name}
                                        className="z-10 h-full w-full object-cover rounded-[14px]"
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                          e.currentTarget.nextElementSibling?.classList.replace("hidden", "flex");
                                        }}
                                      />
                                      <div className={cn("hidden h-full w-full items-center justify-center rounded-[14px]", colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent")}>
                                        <BookOpen className="h-10 w-10 text-white/50" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className={cn("flex h-full w-full items-center justify-center rounded-[14px]", colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent")}>
                                      <BookOpen className="h-10 w-10 text-white/50" />
                                    </div>
                                  )}
                                </div>
                                {/* Content */}
                                <div className="flex min-w-0 flex-1 flex-col p-3">
                                  <div className="mb-1 text-[10px] font-semibold leading-[16px] tracking-[-0.05px] text-primary truncate">
                                    {selectedCategoryDetail.name}
                                  </div>
                                  <h3 className="mb-0 text-[14px] font-semibold leading-[18px] text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                    {course.display_name}
                                  </h3>
                                  <div className="mt-auto pt-2">
                                    {isEnrolled && completionPercent < 100 && (
                                      <div className="mb-1.5">
                                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                                          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${completionPercent}%` }} />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3 w-full">
                                      <div className="flex min-w-0 items-center gap-1 text-[12px] font-bold leading-normal text-primary">
                                        {isEnrolled ? (
                                          completionPercent === 100 ? (
                                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                                              <span className="text-[12px] font-bold">Đã hoàn thành</span>
                                            </div>
                                          ) : (
                                            <>Tiếp tục học <ArrowRight className="h-3 w-3" /></>
                                          )
                                        ) : (
                                          <span className="inline-block rounded-full bg-primary px-4 py-1 text-[11px] font-bold text-white">Bắt đầu học</span>
                                        )}
                                      </div>
                                      {isEnrolled && completionPercent < 100 && (
                                        <span className="text-[10px] font-bold text-primary">{displayPercent}%</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>

                      {/* PC grid */}
                      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-6 md:gap-y-10">
                        {(categoryDetailData.data || []).map((course: any) => (
                          <div key={course.id} className="flex">
                            <ExploreCourseCard
                              course={course}
                              isEnrolled={enrolledIds.has(course.id)}
                              colorStyle={colorStyle}
                              categoryName={selectedCategoryDetail.name}
                              isDemoGuideActive={demoCourseGuideActive && course.id === DEMO_IFRAME_EXPLORE_COURSE_ID}
                              onRequireConfirm={openEnrollConfirm}
                              onCourseClick={handleDemoCourseGuideCourseClick}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {categoryDetailData.total_pages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                          <button
                            onClick={() => setCategoryDetailPage(p => Math.max(1, p - 1))}
                            disabled={categoryDetailPage <= 1}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {Array.from({ length: categoryDetailData.total_pages }, (_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setCategoryDetailPage(i + 1)}
                              className={cn(
                                "inline-flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-semibold transition-all",
                                categoryDetailPage === i + 1
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "border border-border bg-card hover:bg-accent/10"
                              )}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => setCategoryDetailPage(p => Math.min(categoryDetailData.total_pages, p + 1))}
                            disabled={categoryDetailPage >= categoryDetailData.total_pages}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
      <ConfirmEnrollModal
        open={!!pendingConfirmCourse}
        courseName={pendingConfirmCourse?.display_name || ""}
        logoSrc={branding.squareIcon}
        tenantName={branding.tenantName}
        onOpenChange={(open) => {
          if (!open && demoConfirmEnrollGuideActive) return;
          if (!open) {
            setDemoConfirmEnrollGuideActive(false);
            setPendingConfirmCourse(null);
          }
        }}
        onConfirm={handleConfirmStartCourse}
        demoGuideActive={
          demoConfirmEnrollGuideActive
          && pendingConfirmCourse?.id === DEMO_IFRAME_EXPLORE_COURSE_ID
        }
      />
    </>
  );
}

function DemoExploreCourseGuideOverlay({ rect }: { rect: DemoCourseGuideRect }) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const radius = Math.min(28, rect.width / 2, rect.height / 2);
  const blockerClass = "fixed z-[99961] cursor-default bg-transparent";

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
          <mask id="demo-explore-course-guide-mask">
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
          mask="url(#demo-explore-course-guide-mask)"
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
    </>,
    document.body
  );
}

// ── Component con để có thể dùng Hook riêng cho từng card ──
function ExploreCourseCard({
  course,
  isEnrolled,
  colorStyle,
  categoryName,
  isHighlighted = false,
  isDemoGuideActive = false,
  onRequireConfirm,
  onCourseClick,
}: {
  course: any;
  isEnrolled: boolean;
  colorStyle: string;
  categoryName?: string;
  isHighlighted?: boolean;
  isDemoGuideActive?: boolean;
  onRequireConfirm?: (course: any) => void;
  onCourseClick?: (course: any, isEnrolled: boolean) => void;
}) {
  const imageUrl = storageUrl((course as any).image_url) || null;

  // Chỉ gọi API check completion nếu user ĐÃ enroll khóa này
  const { completionPercent } = useCourseCompletion(
    isEnrolled ? course.id : undefined
  );
  const displayPercent = typeof completionPercent === "number" ? Math.floor(Math.round(completionPercent * 100) / 10 + 0.4) / 10 : 0;

  return (
    <Link
      to={`/courses/${encodeURIComponent(course.id)}/lessons/overview`}
      onClick={(event) => {
        onCourseClick?.(course, isEnrolled);
        if (!isEnrolled) {
          event.preventDefault();
          onRequireConfirm?.(course);
        }
      }}
      className="flex flex-1 w-full"
    >
      <Card
        className={cn(
          "group h-[330px] md:h-[420px] flex flex-col flex-1 w-full p-1.5 pb-4 md:pb-6 rounded-[24px] md:rounded-[28px] border-[1.5px] border-primary/55 bg-card shadow-sm transition-all",
          !isDemoGuideActive && "hover:border-primary/80 hover:shadow-md hover:scale-[1.02]",
          (isHighlighted || isDemoGuideActive) && "course-focus-highlight"
        )}
      >
        {/* Ảnh bìa khóa học */}
        <div
          className={cn(
            "flex h-40 md:h-48 items-center justify-center relative overflow-hidden shrink-0 rounded-[18px] md:rounded-[20px]",
            colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent"
          )}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={course.display_name}
              className="absolute inset-0 z-0 h-full w-full object-cover rounded-[18px] md:rounded-[20px]"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          )}
          <BookOpen
            className={cn(
              "h-12 w-12 text-white/50",
              imageUrl ? "hidden" : ""
            )}
          />
        </div>

        <div className="flex flex-col flex-1 px-1.5 pt-3 md:px-2.5 md:pt-4">
          {/* Category label nhỏ màu xanh */}
          {categoryName && (
            <p className="mb-1.5 text-[12px] md:text-[13px] font-medium leading-[16px] text-primary">
              {categoryName}
            </p>
          )}

          <h3
            className={cn(
              "mb-0 text-[16px] md:text-[20px] font-bold leading-[22px] md:leading-[26px] text-foreground transition-colors line-clamp-2",
              !isDemoGuideActive && "group-hover:text-accent"
            )}
          >
            {course.display_name}
          </h3>

          <div className="mt-auto pt-3 md:pt-4">
            {/* Thanh tiến độ — chỉ hiển thị khi đã enroll và chưa hoàn thành */}
            {isEnrolled && typeof completionPercent === "number" && completionPercent < 100 && (
              <div className="mb-3 md:mb-4">
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTA button / link */}
            <div className="flex items-center justify-between gap-3 w-full">
              {isDemoGuideActive ? (
                <span
                  className="demo-iframe-hero-cta-guide-wave-only demo-iframe-hero-cta-guide-blue relative w-fit rounded-full bg-primary px-6 py-2 text-[14px] font-bold leading-[18px] text-white md:px-8 md:py-3 md:text-[15px]"
                >
                  <span className="demo-iframe-hero-cta-echo" aria-hidden="true" />
                  <span className="relative z-10">Bắt đầu học</span>
                </span>
              ) : isEnrolled ? (
                <div className="flex min-w-0 items-center gap-1.5 text-[14px] md:text-[15px] font-bold leading-[20px] text-primary">
                  {completionPercent === 100 ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4 md:h-5 md:w-5 stroke-[3]" />
                      <span className="text-[14px] md:text-[16px] font-bold text-green-600 dark:text-green-400">Đã hoàn thành</span>
                    </div>
                  ) : (
                    <>
                      Tiếp tục học
                      <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </>
                  )}
                </div>
              ) : (
                <span
                  className="w-fit rounded-full bg-primary px-6 md:px-8 py-2 md:py-3 text-[14px] md:text-[15px] font-bold leading-[18px] text-white transition-colors hover:bg-primary/90"
                >
                  Bắt đầu học
                </span>
              )}
              {!isDemoGuideActive && isEnrolled && typeof completionPercent === "number" && completionPercent < 100 && (
                <span className="text-[12px] md:text-[13px] font-bold leading-[16px] text-foreground">
                  {displayPercent}%
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
