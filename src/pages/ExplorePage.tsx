// ============================================================
// ExplorePage — Khám phá khóa học (dữ liệu thật từ Open edX)
// Grouped by category, max 6 per section, expand to full view
// ============================================================

import { useState, useMemo } from "react";
import { Search, Loader2, BookOpen, ArrowRight, CheckCircle2, ChevronLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";
import { useCourses, useMyEnrollments } from "@/hooks/useCourses";
import { useCourseCompletion, useBatchCourseProgress } from "@/hooks/useProgress";
import { sanitizeUrlToRelative } from "@/transformers/staticUrlRewriter";
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

  // State cho detail view khi click "Xem tất cả"
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [detailFilter, setDetailFilter] = useState<DetailFilter>('all');
  const [detailSearch, setDetailSearch] = useState("");

  // State cho right panel filter danh mục (multi-select)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());

  // Set enrolled IDs cho lookup nhanh
  const enrolledIds = new Set(
    (enrollments || []).map((e) => e.course_details.course_id)
  );

  const allCourses = courseData?.results || [];
  const categories = courseData?.categories || [];

  // Batch progress cho tất cả enrolled courses
  const enrolledCourseIds = useMemo(
    () => allCourses.filter(c => enrolledIds.has(c.id)).map(c => c.id),
    [allCourses, enrolledIds]
  );
  const { data: progressMap } = useBatchCourseProgress(enrolledCourseIds);

  // Group courses by category
  const coursesByCategory = useMemo(() => {
    const map = new Map<number, { name: string; courses: typeof allCourses }>();
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
      map.set(-1, { name: "Khóa học khác", courses: uncategorized });
    }
    return map;
  }, [categories, allCourses]);

  // Expanded category data
  const expandedCategory = expandedCategoryId !== null
    ? coursesByCategory.get(expandedCategoryId)
    : null;

  // Filter courses trong detail view
  const filteredDetailCourses = useMemo(() => {
    if (!expandedCategory) return [];
    let filtered = expandedCategory.courses;

    // Apply search
    if (detailSearch.trim()) {
      const q = detailSearch.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.short_description?.toLowerCase().includes(q)
      );
    }

    // Apply filter
    if (detailFilter === 'in_progress') {
      filtered = filtered.filter(c =>
        enrolledIds.has(c.id) && (progressMap?.get(c.id) || 0) < 100
      );
    } else if (detailFilter === 'completed') {
      filtered = filtered.filter(c =>
        enrolledIds.has(c.id) && (progressMap?.get(c.id) || 0) >= 100
      );
    } else if (detailFilter === 'not_enrolled') {
      filtered = filtered.filter(c => !enrolledIds.has(c.id));
    }

    return filtered;
  }, [expandedCategory, detailFilter, detailSearch, enrolledIds, progressMap]);

  // Xử lý search hero với debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 500);
  };

  // Mở detail view
  const handleViewAll = (catId: number) => {
    setExpandedCategoryId(catId);
    setDetailFilter('all');
    setDetailSearch("");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quay lại overview
  const handleBack = () => {
    setExpandedCategoryId(null);
    setDetailFilter('all');
    setDetailSearch("");
  };

  // Right panel click: toggle danh mục trong filter
  const handleCategoryClick = (catId: number | 'all') => {
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

  const isDetailView = expandedCategoryId !== null;

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
            {isDetailView ? (
              /* ══════════════ DETAIL VIEW — Full category ══════════════ */
              <motion.div
                key="detail-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Header + Back button */}
                <div className="mb-6">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại
                  </button>

                  <h1 className="text-[28px] font-bold leading-[34px] text-foreground mb-4">
                    {expandedCategory?.name}
                  </h1>

                  {/* Filter pills + Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Filter pills */}
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

                    {/* Search bar */}
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 sm:ml-auto sm:w-[280px]">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        type="text"
                        value={detailSearch}
                        onChange={(e) => setDetailSearch(e.target.value)}
                        placeholder="Tìm trong danh mục..."
                        className="flex-1 bg-transparent text-[13px] text-foreground placeholder-muted-foreground/60 outline-none"
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-[13px] text-muted-foreground">
                    {filteredDetailCourses.length} khóa học
                  </p>
                </div>

                {/* Course grid */}
                {filteredDetailCourses.length === 0 ? (
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
                ) : (
                  <motion.div
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.06 } },
                    }}
                  >
                    {filteredDetailCourses.map((course) => (
                      <motion.div
                        key={course.id}
                        variants={{
                          hidden: { opacity: 0, y: 16 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.35 }}
                      >
                        <ExploreCourseCard
                          course={course}
                          isEnrolled={enrolledIds.has(course.id)}
                          colorStyle={colorStyle}
                          categoryName={expandedCategory?.name}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ) : (
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
                    className="relative flex-1 rounded-[32px] p-8 overflow-hidden bg-card flex flex-col justify-between min-h-[260px]"
                    style={{ border: '1.5px solid hsl(var(--primary))' }}
                  >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        {/* Badge COURSE */}
                        <div
                          className="mb-4 inline-flex w-fit whitespace-nowrap items-center justify-center h-[23px] rounded-[41px] px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-['SF_Pro',_sans-serif]"
                          style={{ backgroundColor: "#43FDD7", color: "#000" }}
                        >
                          COURSE
                        </div>

                        {/* Title */}
                        <h1 className="mb-6 max-w-[380px] text-[32px] font-bold leading-[40px] text-foreground">
                          Khám phá hành trình học tập của tôi
                        </h1>
                      </div>

                      {/* Search bar */}
                      <div className="mt-auto flex w-full max-w-[340px] items-center gap-2.5 rounded-full border border-border bg-card px-5 py-3 shadow-sm">
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
                      className="hidden md:block absolute right-4 bottom-0 h-[88%] w-auto max-w-[300px] object-contain pointer-events-none select-none z-0"
                    />
                  </div>

                  {/* Right Panel — Bộ lọc khoá học */}
                  <div
                    className="w-full lg:w-[320px] lg:h-[340px] shrink-0 rounded-[32px] bg-card p-8 flex flex-col"
                    style={{ border: '1.5px solid hsl(var(--primary))' }}
                  >
                    <h3 className="text-[18px] font-bold leading-[24px] text-foreground mb-1">
                      Bộ lọc danh mục khoá học
                    </h3>
                    <p className="text-[13px] text-muted-foreground mb-5">
                      Có thể chọn nhiều danh mục
                    </p>
 
                    <div className="flex flex-row flex-wrap lg:flex-col gap-2.5 lg:max-h-[200px] lg:overflow-y-auto lg:pr-1.5">
                      {/* Tất cả danh mục — clear filter */}
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
 
                      {/* Dynamic category buttons — toggle multi-select */}
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

                {/* Category sections — max 6 course cards each */}
                {!isLoading && allCourses.length > 0 && (
                  <div className="space-y-10">
                    {visibleCategories.map(([catId, { name, courses: catCourses }]) => {
                      const displayCourses = catCourses.slice(0, 6);
                      const hasMore = catCourses.length > 6;

                      return (
                        <section key={catId} id={`category-section-${catId}`} className="scroll-mt-6">
                          {/* Category header */}
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-baseline gap-2">
                              <h2 className="text-[22px] font-bold leading-[28px] text-foreground">
                                {name}
                              </h2>
                              <span className="text-[13px] text-muted-foreground">
                                ({catCourses.length} khóa học)
                              </span>
                            </div>
                            <button
                              onClick={() => handleViewAll(catId)}
                              className="flex items-center gap-1 text-[14px] font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
                            >
                              Xem tất cả
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Course grid — max 6 */}
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
            )}
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
  const imageUrl = sanitizeUrlToRelative(
    course.media?.image?.large || course.media?.course_image?.uri || null
  );

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
              alt={course.name}
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
            {course.name}
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
