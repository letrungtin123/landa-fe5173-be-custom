// ============================================================
// ExplorePage — Khám phá khóa học (dữ liệu thật từ Open edX)
// Tìm kiếm + danh sách courses từ API
// ============================================================

import { useState } from "react";
import { Search, Compass, Loader2, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeStore } from "@/stores/useThemeStore";
import { config } from "@/config/env";
import { cn } from "@/lib/utils";
import { useCourses, useMyEnrollments } from "@/hooks/useCourses";
import { useCourseCompletion } from "@/hooks/useProgress";

export function ExplorePage() {
  const { colorStyle } = useThemeStore();
  const [searchTerm, setSearchTerm] = useState("");
  // Debounce search — chỉ gọi API khi người dùng ngừng gõ
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: courseData, isLoading } = useCourses(debouncedSearch || undefined);
  const { data: enrollments } = useMyEnrollments();

  // Set enrolled IDs cho lookup nhanh
  const enrolledIds = new Set(
    (enrollments || []).map((e) => e.course_details.course_id)
  );

  const courses = courseData?.results || [];

  // Xử lý search với debounce đơn giản
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Debounce 500ms
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 500);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      {/* Hero Section */}
      <div
        className={cn(
          "mb-8 rounded-2xl p-8 text-white md:p-12",
          colorStyle === "gradient" ? "bg-gradient-to-r from-primary to-primary/80" : "bg-primary"
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
            Khám phá
          </span>
        </div>
        <h1 className="mb-3 text-3xl font-bold md:text-4xl">
          Khám phá hành trình học tập
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/80">
          Tìm kiếm khóa học phù hợp với nhu cầu phát triển của bạn. Từ kỹ năng
          mềm đến kiến thức chuyên môn.
        </p>

        {/* Thanh tìm kiếm — gọi API thật */}
        <div className="mt-6 flex max-w-md items-center gap-2 rounded-lg bg-white/20 px-4 py-2.5 backdrop-blur-sm">
          <Search className="h-4 w-4 text-white/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm kiếm khóa học..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/50 outline-none"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
        </div>
      </div>

      {/* Tiêu đề danh sách */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          {debouncedSearch ? `Kết quả cho "${debouncedSearch}"` : "Tất cả khóa học"}
        </h2>
        <span className="text-sm text-muted-foreground">
          {courses.length} khóa học
        </span>
      </div>

      {/* Đang tải */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-full flex flex-col overflow-hidden border-border shadow-sm">
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

      {/* Không tìm thấy */}
      {!isLoading && courses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-10 w-10 text-primary/40" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">
            {debouncedSearch ? "Không tìm thấy khóa học" : "Chưa có khóa học nào"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {debouncedSearch
              ? `Không có khóa học nào phù hợp với "${debouncedSearch}". Hãy thử từ khóa khác.`
              : "Hệ thống chưa có khóa học nào. Vui lòng quay lại sau."}
          </p>
        </div>
      )}

      {/* Danh sách khóa học */}
      {!isLoading && courses.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <ExploreCourseCard
              key={course.id}
              course={course}
              isEnrolled={enrolledIds.has(course.id)}
              colorStyle={colorStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Component con để có thể dùng Hook riêng cho từng card ──
function ExploreCourseCard({
  course,
  isEnrolled,
  colorStyle,
}: {
  course: any;
  isEnrolled: boolean;
  colorStyle: string;
}) {
  const imageUrl =
    course.media?.image?.large || course.media?.course_image?.uri;

  // Chỉ gọi API check completion nếu user ĐÃ enroll khóa này
  const { completionPercent } = useCourseCompletion(
    isEnrolled ? course.id : undefined
  );

  return (
    <Link to={`/courses/${encodeURIComponent(course.id)}/lessons/overview`}>
      <Card className="group h-full flex flex-col overflow-hidden border-border shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
        {/* Ảnh bìa khóa học */}
        <div
          className={cn(
            "flex h-48 items-center justify-center relative overflow-hidden shrink-0",
            colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent"
          )}
        >
          {imageUrl ? (
            <img
              src={
                imageUrl.startsWith("http")
                  ? imageUrl
                  : `${config.lmsBaseUrl}${imageUrl}`
              }
              alt={course.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={cn(
              "flex items-center justify-center absolute inset-0",
              imageUrl ? "hidden" : ""
            )}
          >
            <BookOpen className="h-12 w-12 text-white/50" />
          </div>
        </div>

        <CardContent className="p-5 flex flex-col flex-1">
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
            <Badge variant="outline" className="text-[10px]">
              {course.pacing === "self" ? "Tự học" : "Có hướng dẫn"}
            </Badge>
          </div>
          <h3 className="mb-1 text-lg font-bold text-foreground group-hover:text-accent transition-colors">
            {course.name}
          </h3>
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {course.short_description || `${course.org}`}
          </p>

          <div className="mt-auto pt-4">
            {isEnrolled && typeof completionPercent === "number" && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Tiến độ
                  </span>
                  <span className="text-[11px] font-bold text-success">
                    {completionPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-[width] duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm font-semibold text-accent">
              {isEnrolled ? "Tiếp tục học" : "Xem chi tiết"}
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
