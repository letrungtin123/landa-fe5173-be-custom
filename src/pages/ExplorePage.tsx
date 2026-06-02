// ============================================================
// ExplorePage — Khám phá khóa học (dữ liệu thật từ Open edX)
// Grouped by category, filter theo trạng thái học
// ============================================================

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Loader2, BookOpen, ArrowRight, Check, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";
import { useCourses, useMyEnrollments } from "@/hooks/useCourses";
import { useCourseCompletion, useBatchCourseProgress } from "@/hooks/useProgress";

import heroIllustration from "@/assets/ExplorePage/KhamPhaHanhTrinhHocTapCuaToi.png";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";

// Filter types cho detail view
type DetailFilter = 'all' | 'in_progress' | 'completed' | 'not_enrolled';

export function ExplorePage() {
  const { colorStyle } = useThemeStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: courseData, isLoading } = useCourses(debouncedSearch || undefined);
  const { data: enrollments } = useMyEnrollments();

  // State cho bộ filter trạng thái học (hiển thị mặc định)
  const [detailFilter, setDetailFilter] = useState<DetailFilter>('all');

  // State cho right panel filter danh mục (multi-select)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside để đóng dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
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

  // Batch progress cho tất cả enrolled courses
  const enrolledCourseIds = useMemo(
    () => allCourses.filter(c => enrolledIds.has(c.id)).map(c => c.id),
    [allCourses, enrolledIds]
  );
  const { data: progressMap } = useBatchCourseProgress(enrolledCourseIds);

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



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-[1420px] px-4 pb-8 md:px-8 xl:px-10"
    >
      <div className="flex flex-col lg:flex-row w-full">
        {/* Left Sidebar */}
        <div className="w-full lg:w-[280px] shrink-0 lg:border-r lg:border-border lg:pr-8 pt-4 lg:pt-8 mb-6 lg:mb-0">
          <div className="sticky top-24 space-y-10 max-h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar pb-8">
            <UserProfileCard />
            <BadgeShowcase />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:pl-8 mt-8 lg:mt-0 pt-8">
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
                    className="relative flex-1 rounded-[32px] p-6 bg-card flex flex-col justify-between min-h-[250px] lg:h-[270px]"
                    style={{ border: '1.5px solid hsl(var(--primary))' }}
                  >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        {/* Badge COURSE */}
                        <div
                          className="mb-3 inline-flex w-fit whitespace-nowrap items-center justify-center h-[23px] rounded-[41px] px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-['SF_Pro',_sans-serif]"
                          style={{ backgroundColor: "#43FDD7", color: "#000" }}
                        >
                          COURSE
                        </div>

                        {/* Title */}
                        <h1 className="mb-4 max-w-[320px] text-[24px] lg:text-[26px] font-bold leading-[32px] text-foreground">
                          Khám phá hành trình học tập của tôi
                        </h1>
                      </div>

                      {/* Search bar */}
                      <div className="mt-auto flex w-full max-w-[340px] items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2.5 shadow-sm">
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
                    </div>

                    {/* Illustration */}
                    <img
                      src={heroIllustration}
                      alt="Khám phá hành trình học tập"
                      className="hidden md:block absolute right-6 pt-8 bottom-0 h-[280px] w-auto max-w-[260px] object-contain pointer-events-none select-none z-0"
                    />
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

                {/* Bộ lọc trạng thái học + dropdown danh mục */}
                <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
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
                  <div className="relative" ref={dropdownRef}>
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
                          className="absolute right-0 top-full mt-2 z-50 w-[240px] rounded-2xl border border-border bg-card p-2 shadow-xl"
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
                {!isLoading && (allCourses.length === 0 || visibleCategories.length === 0) && (
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

                {/* Category sections — hiển thị tất cả courses */}
                {!isLoading && allCourses.length > 0 && (
                  <div className="space-y-10">
                    {visibleCategories.map(([catId, { name, courses: catCourses }]) => {
                      const displayCourses = applyStatusFilter(catCourses);

                      // Ẩn category nếu filter ra 0 kết quả
                      if (displayCourses.length === 0) return null;

                      return (
                        <section key={catId} id={`category-section-${catId}`} className="scroll-mt-6">
                          {/* Category header */}
                          <div className="flex items-baseline gap-2 mb-5">
                            <h2 className="text-[22px] font-bold leading-[28px] text-foreground">
                              {name}
                            </h2>
                            <span className="text-[13px] text-muted-foreground">
                              ({displayCourses.length} khóa học)
                            </span>
                          </div>

                          {/* Course grid — hiển thị tất cả */}
                          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {displayCourses.map((course) => (
                              <ExploreCourseCard
                                key={course.id}
                                course={course}
                                isEnrolled={enrolledIds.has(course.id)}
                                colorStyle={colorStyle}
                                categoryName={name}
                              />
                            ))}
                          </div>

                        </section>
                      );
                    })}
                  </div>
                )}
              </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Component con để có thể dùng Hook riêng cho từng card ──
function ExploreCourseCard({
  course,
  isEnrolled,
  colorStyle,
  categoryName,
}: {
  course: any;
  isEnrolled: boolean;
  colorStyle: string;
  categoryName?: string;
}) {
  const imageUrl = (course as any).image_url || null;

  // Chỉ gọi API check completion nếu user ĐÃ enroll khóa này
  const { completionPercent } = useCourseCompletion(
    isEnrolled ? course.id : undefined
  );

  return (
    <Link to={`/courses/${encodeURIComponent(course.id)}/lessons/overview`}>
      <Card className="group h-full flex flex-col p-2 pb-4 rounded-[28px] border-border bg-card shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
        {/* Ảnh bìa khóa học */}
        <div
          className={cn(
            "flex h-48 items-center justify-center relative overflow-hidden shrink-0 rounded-[20px]",
            colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent"
          )}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={course.display_name}
              className="absolute inset-0 z-10 h-full w-full object-cover rounded-[20px]"
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

        <div className="pt-4 px-2 flex flex-col flex-1">
          {/* Category label nhỏ màu xanh */}
          {categoryName && (
            <p className="mb-1.5 text-[13px] font-medium leading-[16px] text-primary">
              {categoryName}
            </p>
          )}

          <h3 className="mb-5 text-[20px] font-bold leading-[26px] text-foreground group-hover:text-accent transition-colors line-clamp-2">
            {course.display_name}
          </h3>

          <div className="mt-auto pt-5">
            {/* Thanh tiến độ — chỉ hiển thị khi đã enroll và chưa hoàn thành */}
            {isEnrolled && typeof completionPercent === "number" && completionPercent < 100 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-medium leading-[16px] text-muted-foreground">
                    Tiến độ
                  </span>
                  <span className="text-[13px] font-bold leading-[16px] text-foreground">
                    {completionPercent}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTA button / link */}
            {isEnrolled ? (
              <div className="flex items-center gap-1.5 text-[15px] font-bold leading-[20px] text-primary">
                {completionPercent === 100 ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="h-5 w-5 stroke-[3]" />
                    <span className="text-[16px] font-bold text-green-600 dark:text-green-400">Đã hoàn thành</span>
                  </div>
                ) : (
                  <>
                    Tiếp tục học
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </div>
            ) : (
              <button
                className="w-fit rounded-full bg-primary px-8 py-3 text-[15px] font-bold leading-[18px] text-white transition-colors hover:bg-primary/90"
              >
                Bắt đầu học
              </button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
