// ============================================================
// CoursesPage — Danh sách khóa học (API thật + Enroll + Certificate)
// ============================================================

import { BookOpen, ArrowRight, Loader2, Award } from "lucide-react";
import { useState, useMemo } from "react";
import { storageUrl } from "@/utils/storageUrl";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useCourses, useMyEnrollments, useEnrollCourse } from "@/hooks/useCourses";
import { useMyCertificates } from "@/hooks/useCertificates";
import { useBatchCourseProgress } from "@/hooks/useProgress";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useBranding } from "@/hooks/useBranding";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { CourseFilterBar, type CourseFilter } from "@/components/CourseFilterBar";
import type { CourseCategoryInfo } from "@/api/types";

export function CoursesPage() {
  const { colorStyle } = useThemeStore();
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === 'staff' || role === 'superuser' || role === 'superadmin';
  const { data: courseList, isLoading } = useCourses();
  const { branding } = useBranding();
  const { data: enrollments } = useMyEnrollments();
  const { data: certificates } = useMyCertificates();
  const enrollMutation = useEnrollCourse();
  const [activeFilter, setActiveFilter] = useState<CourseFilter>('all');

  // Lookup sets cho tra cứu nhanh
  const enrolledIds = new Set(
    (enrollments || []).map((e: any) => e.course_id)
  );
  const certMap = new Map(
    (certificates || []).map((c) => [c.course_id, c])
  );

  // Categories từ API response
  const categories: CourseCategoryInfo[] = [];
  const allCourses = courseList?.data || [];

  // Batch progress cho tất cả enrolled courses
  const enrolledCourseIds = useMemo(
    () => allCourses.filter(c => enrolledIds.has(c.id)).map(c => c.id),
    [allCourses, enrolledIds]
  );
  const { data: progressMap } = useBatchCourseProgress(enrolledCourseIds);

  // Tính counts
  const completedCount = allCourses.filter(c => (progressMap?.get(c.id) || 0) >= 100).length;
  const inProgressCount = allCourses.filter(c => enrolledIds.has(c.id) && (progressMap?.get(c.id) || 0) < 100).length;
  const categoryCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const cat of categories) {
      m.set(cat.id, allCourses.filter(c => c.categories?.some(cc => cc.id === cat.id)).length);
    }
    return m;
  }, [categories, allCourses]);

  // Filter courses
  const courses = useMemo(() => {
    if (activeFilter === 'all') return allCourses;
    if (activeFilter === 'completed') return allCourses.filter(c => (progressMap?.get(c.id) || 0) >= 100);
    if (activeFilter === 'in_progress') return allCourses.filter(c => enrolledIds.has(c.id) && (progressMap?.get(c.id) || 0) < 100);
    // category filter (number)
    return allCourses.filter(c => c.categories?.some(cat => cat.id === activeFilter));
  }, [activeFilter, allCourses, progressMap, enrolledIds]);

  // Xử lý đăng ký khóa học
  const handleEnroll = (e: React.MouseEvent, courseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    enrollMutation.mutate(courseId);
  };

  if (isLoading && courses.length === 0) {
    // Để layout không bị shift, ta gộp bộ khung vào chung một block
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-foreground">Chương trình học</h1>
        {/* Staff/Admin có link truy cập admin dashboard */}
        {isStaff && (
          <a
            href={branding.adminUrl || '/admin'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Quản trị hệ thống
          </a>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {isLoading && courses.length === 0 
          ? "Đang tải dữ liệu khóa học..." 
          : "Khám phá các khóa học và chương trình đào tạo tại L&A"}
      </p>

      {/* Filter Bar */}
      <CourseFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalCount={allCourses.length}
        completedCount={completedCount}
        inProgressCount={inProgressCount}
        categories={categories}
        categoryCounts={categoryCounts}
      />

      <AnimatePresence mode="wait">
        {isLoading && courses.length === 0 ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={`skeleton-${i}`} className="h-full flex flex-col overflow-hidden border-border shadow-sm">
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex gap-2 mb-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : courses.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center"
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-10 w-10 text-primary/40" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">Chưa có khóa học nào</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Hệ thống chưa có khóa học nào được tạo. Vui lòng liên hệ admin hoặc quay lại sau.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="courses"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {courses.map((course, index) => {
              const isEnrolled = enrolledIds.has(course.id);
              const cert = certMap.get(course.id);
              const imageUrl = storageUrl(course.image_url) || null;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <Link to={`/courses/${encodeURIComponent(course.id)}/lessons/overview`}>
                    <Card className="group overflow-hidden border-border shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                      {/* Ảnh bìa */}
                      <div
                        className={cn(
                          "flex h-48 items-center justify-center relative overflow-hidden",
                          colorStyle === "gradient"
                            ? "accent-surface-gradient"
                            : "bg-accent"
                        )}
                      >
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={course.display_name}
                            className="absolute inset-0 z-10 h-full w-full object-cover"
                            onError={(e) => {
                              // Ảnh 404 → ẩn img, hiện icon fallback
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

                        {/* Badge chứng chỉ */}
                        {cert && cert.is_passing && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-warning text-warning-foreground font-bold text-[10px] gap-1">
                              <Award className="h-3 w-3" />
                              Đã đạt
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              isEnrolled
                                ? "border-success/30 bg-success/10 text-success"
                                : "border-primary/30 bg-primary/10 text-primary"
                            )}
                          >
                            {isEnrolled ? "Đang học" : "Khóa học"}
                          </Badge>
                          {course.categories?.map(cat => (
                            <Badge
                              key={cat.id}
                              variant="outline"
                              className="border-accent/30 bg-accent/10 text-accent text-[10px] px-2 py-0"
                            >
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                          {course.display_name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {course.org}
                        </p>

                        {/* Hành động */}
                        <div className="mt-3 flex items-center justify-between">
                          {isEnrolled ? (
                            <span className="flex items-center gap-1 text-sm font-semibold text-accent">
                              Tiếp tục
                              <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <button
                              onClick={(e) => handleEnroll(e, course.id)}
                              disabled={enrollMutation.isPending}
                              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {enrollMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : null}
                              Đăng ký
                            </button>
                          )}

                          {/* Link xem chứng chỉ */}
                          {cert && cert.download_url && (
                            <a
                              href={cert.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs font-medium text-warning hover:text-warning/80 transition-colors"
                            >
                              <Award className="h-3.5 w-3.5" />
                              Chứng chỉ
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
