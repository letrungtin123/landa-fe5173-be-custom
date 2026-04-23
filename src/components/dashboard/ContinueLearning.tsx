// ============================================================
// ContinueLearning — Danh sách khóa học đang học + tiến độ thật
// ============================================================

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useCourseCompletion } from "@/hooks/useProgress";
import type { ContinueCourse } from "@/data/types";

/** Card hiển thị 1 khóa học đang học kèm progress bar */
function CourseCard({ course, index }: { course: ContinueCourse; index: number }) {
  const { completionPercent } = useCourseCompletion(course.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 * index }}
    >
      <Link to={`/courses/${encodeURIComponent(course.id)}/lessons/overview`}>
        <div className="group flex h-[180px] overflow-hidden rounded-2xl border border-border shadow-[0_2px_10px_rgb(0,0,0,0.02)] bg-card transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
          {/* Thumbnail */}
          <div className="w-[35%] shrink-0 bg-muted relative flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/15" />
          </div>

          {/* Nội dung */}
          <div className="flex flex-col p-5 w-[65%]">
            <div className="mb-2 w-full flex items-center gap-1.5 text-[11px] font-bold text-primary">
              <span>{course.moduleLabel}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="truncate">{course.lessonLabel}</span>
            </div>

            <h3 className="text-[17px] font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {course.title}
            </h3>

            <div className="mt-auto">
              {/* Thanh tiến độ thật */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Tiến độ
                  </span>
                  <span className="text-[11px] font-bold text-primary">
                    {completionPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
              <span className="flex items-center gap-1 text-[13px] font-bold text-primary">
                Tiếp tục học
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ContinueLearning() {
  const { data: enrollments, isLoading, error } = useMyEnrollments();

  // Chuyển enrollments → ContinueCourse format
  const courses: ContinueCourse[] =
    enrollments && enrollments.length > 0
      ? enrollments.map((e) => ({
          id: e.course_details.course_id,
          moduleLabel: "Course",
          lessonLabel: e.course_details.course_name,
          title: e.course_details.course_name,
          thumbnail: null,
        }))
      : [];

  return (
    <div>
      {/* Tiêu đề */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Tiếp tục học</h2>
        <Link
          to="/courses"
          className="flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          Xem tất cả
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Đang tải */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
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
          className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center"
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
        <div className="grid gap-6 sm:grid-cols-2">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
