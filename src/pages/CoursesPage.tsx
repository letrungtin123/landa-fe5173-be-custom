// ============================================================
// CoursesPage — Danh sách khóa học (API thật + Enroll + Certificate)
// ============================================================

import { BookOpen, ArrowRight, Loader2, Award, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useCourses, useMyEnrollments, useEnrollCourse } from "@/hooks/useCourses";
import { useMyCertificates } from "@/hooks/useCertificates";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { config } from "@/config/env";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function CoursesPage() {
  const { colorStyle } = useThemeStore();
  const isStaff = useAuthStore((s) => s.user?.isStaff);
  const { data: courseList, isLoading } = useCourses();
  const { data: enrollments } = useMyEnrollments();
  const { data: certificates } = useMyCertificates();
  const enrollMutation = useEnrollCourse();

  // Lookup sets cho tra cứu nhanh
  const enrolledIds = new Set(
    (enrollments || []).map((e) => e.course_details.course_id)
  );
  const certMap = new Map(
    (certificates || []).map((c) => [c.course_id, c])
  );

  const courses = courseList?.results || [];

  // Xử lý đăng ký khóa học
  const handleEnroll = (e: React.MouseEvent, courseId: string) => {
    e.preventDefault(); // Ngăn navigate khi click Enroll
    e.stopPropagation();
    enrollMutation.mutate(courseId);
  };

  if (isLoading && courses.length === 0) {
    // Để layout không bị shift, ta gộp bộ khung vào chung một block
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-foreground">Chương trình học</h1>
        {/* Staff/Admin có link truy cập Studio */}
        {isStaff && (
          <a
            href={config.studioBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Quản lý trên Studio
          </a>
        )}
      </div>
      <p className="mb-8 text-sm text-muted-foreground">
        {isLoading && courses.length === 0 
          ? "Đang tải dữ liệu khóa học..." 
          : "Khám phá các khóa học và chương trình đào tạo tại L&A"}
      </p>

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
              const imageUrl = course.media?.image?.large || course.media?.course_image?.uri;

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
                            src={imageUrl.startsWith("http") ? imageUrl : `${config.lmsBaseUrl}${imageUrl}`}
                            alt={course.name}
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
                        <div className="flex items-center gap-2 mb-2">
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
                        </div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                          {course.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {course.short_description || `${course.org} • ${course.pacing === "self" ? "Tự học" : "Có hướng dẫn"}`}
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
