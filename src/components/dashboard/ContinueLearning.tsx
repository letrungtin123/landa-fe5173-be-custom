// ============================================================
// ContinueLearning — Danh sách khóa học đang học + tiến độ thật
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { storageUrl } from "@/utils/storageUrl";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEnrollments, useCourses } from "@/hooks/useCourses";
import { useBatchCourseProgress } from "@/hooks/useProgress";

import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";
import type { ContinueCourse } from "@/data/types";
import { sanitizeUrlToRelative } from "@/transformers/staticUrlRewriter";
import { CourseFilterBar, type CourseFilter } from "@/components/CourseFilterBar";
import type { CourseCategoryInfo } from "@/api/types";

/** Card hiển thị 1 khóa học đang học kèm progress bar */
function CourseCard({ course, index, isLast, completionPercent }: { course: ContinueCourse; index: number; isLast: boolean; completionPercent: number }) {
  const { colorStyle } = useThemeStore();
  const displayPercent = Math.floor(Math.round(completionPercent * 100) / 10 + 0.4) / 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-[85vw] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none md:shrink flex"
    >
      <Link to={`/courses/${encodeURIComponent(course.id)}/lessons/overview`} className="flex flex-1 w-full">
        <div className="group flex flex-col md:flex-row flex-1 w-full h-[330px] md:h-[180px] overflow-hidden rounded-[28px] md:rounded-3xl border border-border md:border-primary shadow-sm md:shadow-[0_2px_10px_rgb(0,0,0,0.02)] bg-card transition-all duration-200 hover:shadow-md hover:scale-[1.02] p-2 pb-4 md:p-0 md:pb-0">
          {/* Thumbnail */}
          <div className="w-full md:w-[40%] h-40 md:h-full shrink-0 relative flex items-center justify-center overflow-hidden md:p-1.5 rounded-[20px] md:rounded-none">
            {course.thumbnail ? (
              <>
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="z-10 h-full w-full object-cover rounded-[20px] md:rounded-[18px]"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.replace("hidden", "flex");
                  }}
                />
                <div 
                  className={cn(
                     "hidden h-full w-full items-center justify-center rounded-[20px] md:rounded-[18px]",
                     colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent"
                  )}
                >
                  <BookOpen className="h-10 w-10 md:h-12 md:w-12 text-white/50" />
                </div>
              </>
            ) : (
              <div 
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-[20px] md:rounded-[18px]",
                  colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent"
                )}
              >
                <BookOpen className="h-12 w-12 md:h-10 md:w-10 text-white/50" />
              </div>
            )}
          </div>

          {/* Nội dung */}
          <div className="flex flex-col flex-1 pt-3 px-2 md:p-5 md:w-[60%]">
            <div className="mb-1 md:mb-2 w-full flex items-center gap-1.5 text-[12px] md:text-[10px] font-medium md:font-semibold leading-[16px] md:leading-[20px] tracking-normal md:tracking-[-0.05px] text-primary">
              <span className="truncate">
                {course.categories && course.categories.length > 0
                  ? course.categories.map((c) => c.name).join(" • ")
                  : "Khóa học"}
              </span>
            </div>

            <h3 className="mb-4 md:mb-0 text-[16px] md:text-[20px] font-bold md:font-semibold leading-[22px] md:leading-[24px] tracking-normal text-foreground group-hover:text-accent md:group-hover:text-primary transition-colors line-clamp-2">
              {course.title}
            </h3>

            <div className="mt-auto pt-3 md:pt-0">
              {/* Thanh tiến độ thật */}
              {completionPercent < 100 && (
                <div className="mb-3 md:mb-2">
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Button text */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 md:gap-1 text-[14px] md:text-[13px] font-bold leading-[20px] md:leading-normal text-primary">
                  {completionPercent === 100 ? (
                    <div className="flex items-center gap-2 md:gap-1.5 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4 md:h-4 md:w-4 stroke-[3]" />
                      <span className="text-[14px] md:text-[13px] font-bold text-green-600 dark:text-green-400">Đã hoàn thành</span>
                    </div>
                  ) : (
                    <>
                      Tiếp tục học
                      <ArrowRight className="h-3.5 w-3.5 md:h-3.5 md:w-3.5" />
                    </>
                  )}
                </div>
                {completionPercent < 100 && (
                  <span className="text-[12px] md:text-[11px] font-bold text-foreground md:text-primary">
                    {displayPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ContinueLearning() {
  const { data: enrollments, isLoading: enrollLoading, error } = useMyEnrollments();
  const { data: courseList, isLoading: coursesLoading } = useCourses();
  const [activeFilter, setActiveFilter] = useState<CourseFilter>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const pageSizeRef = useRef<HTMLDivElement>(null);

  // Click outside để đóng page size dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target as Node)) {
        setPageSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    // Khi bộ lọc thay đổi, nếu phần đầu của danh sách bị khuất phía trên thì cuộn mượt lại lên vị trí đó
    const container = document.getElementById("continue-learning-section");
    if (container) {
      const rect = container.getBoundingClientRect();
      if (rect.top < 0) {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [activeFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const container = document.getElementById("continue-learning-section");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const isLoading = enrollLoading || coursesLoading;
  
  const coursesData = courseList?.data || [];
  const courseMap = new Map(coursesData.map((c: any) => [c.id, c]));
  const categories: CourseCategoryInfo[] = [];

  // Chuyển enrollments → ContinueCourse format
  const allCourses: ContinueCourse[] =
    enrollments && enrollments.length > 0
      ? enrollments
          .filter((e: any) => courseMap.has(e.course_id))
          .map((e: any) => {
            const courseId = e.course_id;
            const fullCourse = courseMap.get(courseId);
          
            const imageUrl = storageUrl((fullCourse as any)?.image_url) || null;
          
            return {
              id: courseId,
              moduleLabel: "Course",
              lessonLabel: e.display_name,
              title: e.display_name,
              thumbnail: imageUrl,
              categories: [],
            };
          })
      : [];

  // Batch progress
  const courseIds = useMemo(() => allCourses.map(c => c.id), [allCourses]);
  const { data: progressMap } = useBatchCourseProgress(courseIds);

  // Counts
  const completedCount = allCourses.filter(c => (progressMap?.get(c.id) || 0) >= 100).length;
  const inProgressCount = allCourses.filter(c => (progressMap?.get(c.id) || 0) < 100).length;
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const cat of categories) {
      m.set(cat.id, allCourses.filter(c => c.categories?.some(cc => String(cc.id) === String(cat.id))).length);
    }
    return m;
  }, [categories, allCourses]);

  // Filter
  const courses = useMemo(() => {
    let filtered = allCourses;
    
    // Filter by status
    if (activeFilter === 'completed') {
      filtered = allCourses.filter(c => (progressMap?.get(c.id) || 0) >= 100);
    } else if (activeFilter === 'in_progress') {
      filtered = allCourses.filter(c => (progressMap?.get(c.id) || 0) < 100);
    } else if (activeFilter !== 'all') {
      filtered = allCourses.filter(c => c.categories?.some(cat => String(cat.id) === String(activeFilter)));
    }
    
    // Filter by search term (bỏ dấu tiếng Việt khi so sánh)
    if (searchTerm.trim()) {
      const normalize = (s: string) =>
        s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
      const q = normalize(searchTerm);
      filtered = filtered.filter(c => normalize(c.title).includes(q));
    }
    
    return filtered;
  }, [activeFilter, allCourses, progressMap, searchTerm]);

  const totalPages = Math.ceil(courses.length / itemsPerPage);

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return courses.slice(startIndex, startIndex + itemsPerPage);
  }, [courses, currentPage]);

  return (
    <div id="continue-learning-section" className="scroll-mt-24">
      {/* Tiêu đề + Search + Xem tất cả */}
      <div className="mb-6 flex items-center gap-4">
        <h2 className="text-lg font-bold text-foreground whitespace-nowrap shrink-0">Tiếp tục học</h2>

        {/* Search bar — giữa */}
        {allCourses.length > 0 && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm khóa học..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-full outline-none focus:border-primary transition-colors text-[13px] font-normal leading-[18px] shadow-sm"
            />
          </div>
        )}

        <Link
          onClick={() => window.scrollTo(0, 0)}
          to="/explore"
          className="flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent/80 whitespace-nowrap shrink-0 ml-auto"
        >
          Xem tất cả
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Filter Bar — tạm comment
      {allCourses.length > 0 && (
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CourseFilterBar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              totalCount={allCourses.length}
              completedCount={completedCount}
              inProgressCount={inProgressCount}
              categories={categories}
              categoryCounts={categoryCounts}
              showOnlyStatus={true}
              className="mb-0"
            />
          </div>
        </div>
      )}
      */}

      {/* Đang tải */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex h-[180px] overflow-hidden rounded-2xl border border-border bg-card">
              <Skeleton className="w-[35%] h-full rounded-none" />
              <div className="flex flex-col p-5 w-[65%]">
                <Skeleton className="h-3 w-1/2 mb-3" />
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-5 w-1/2 mb-auto" />
                <Skeleton className="h-3 w-full mb-1 mt-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lỗi */}
      {error && !isLoading && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <BookOpen className="h-6 w-6 text-destructive/60" />
          </div>
          <p className="text-sm text-muted-foreground">Không thể tải dữ liệu khóa học.</p>
        </div>
      )}

      {/* Trạng thái trống */}
      {!isLoading && !error && courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center w-full"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary/50" />
          </div>
          <h3 className="mb-2 text-base font-bold text-foreground">Chưa có khóa học nào</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Bạn chưa đăng ký khóa học nào. Hãy khám phá các khóa học có sẵn!
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            Khám phá khóa học
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}

      {/* Danh sách khóa học với progress bar thật */}
      {courses.length > 0 && (
        <div className="space-y-8">
          <div
            className="flex items-stretch overflow-x-auto snap-x snap-mandatory gap-4 pb-4 pl-2 -mr-4 md:pl-0 md:mr-0 md:grid md:grid-cols-2 md:gap-6 md:pb-0 md:overflow-visible hide-scrollbar"
          >
            {paginatedCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} isLast={index === paginatedCourses.length - 1} completionPercent={progressMap?.get(course.id) || 0} />
            ))}
          </div>

          {/* Phân trang — luôn hiện khi có data để user thấy page size selector */}
          {courses.length > 0 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-semibold leading-[18px] transition-all duration-200",
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "border border-border bg-card hover:bg-accent/10"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang sau"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Page size selector — custom dropdown */}
              <div className="ml-4 flex items-center gap-1.5 border-l border-border pl-4">
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">Hiển thị</span>
                <div className="relative" ref={pageSizeRef}>
                  <button
                    onClick={() => setPageSizeOpen(prev => !prev)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    {itemsPerPage}
                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", pageSizeOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {pageSizeOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full mb-2 left-0 z-50 min-w-[48px] rounded-xl border border-border bg-card p-1 shadow-lg"
                      >
                        {[2, 4, 6].map(size => (
                          <button
                            key={size}
                            onClick={() => {
                              setItemsPerPage(size);
                              setCurrentPage(1);
                              setPageSizeOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors",
                              itemsPerPage === size
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
