// ============================================================
// DashboardPage — Trang chính learner (dữ liệu thật từ API)
// ============================================================

import { motion } from "framer-motion";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { ContinueLearning } from "@/components/dashboard/ContinueLearning";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useMyEnrollments, useCourses } from "@/hooks/useCourses";
import { useCourseCompletion } from "@/hooks/useProgress";

export function DashboardPage() {
  const { isLoading: pageLoading } = usePageLoading(1000);
  const { data: enrollments } = useMyEnrollments();
  const { data: courseList } = useCourses();

  // Chỉ lấy enrollment có course trong danh sách public (đã filter bởi BE)
  const publicCourseIds = new Set((courseList?.results || []).map((c) => c.id));
  const visibleEnrollments = (enrollments || []).filter(
    (e) => publicCourseIds.has(e.course_details.course_id)
  );

  // Lấy khóa học đầu tiên đang enrolled để hiển thị tiến độ
  const firstCourseId = visibleEnrollments[0]?.course_details.course_id;
  const firstCourseName = visibleEnrollments[0]?.course_details.course_name;
  const { completionPercent } = useCourseCompletion(firstCourseId);

  if (pageLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-[1420px] px-4 pb-8 md:px-8 xl:px-10"
      >
        <div className="flex flex-col lg:flex-row">
          {/* Thanh bên trái */}
          <div className="w-full lg:w-[280px] shrink-0 lg:border-r lg:border-border lg:pr-12 pt-8">
            <div className="sticky top-24 space-y-10 max-h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar pb-8">
              <UserProfileCard />
              <BadgeShowcase />
            </div>
          </div>

          {/* Nội dung chính */}
          <div className="flex-1 min-w-0 lg:pl-12 mt-8 lg:mt-0 pt-8 space-y-10">
            {/* Phần trên */}
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Banner chào mừng */}
              <div className="flex-1 space-y-6 w-full">
                <WelcomeBanner />
              </div>

              {/* Cột thống kê bên phải */}
              <div className="hidden lg:flex flex-col gap-4 lg:w-[240px] shrink-0">
                {/* Spacer để giữ ProgressRing không bị đẩy lên quá cao, nhưng đã được giảm kích thước để xích lên trên một tí */}
                <div className="h-[79px] mb-2 w-full pointer-events-none" />
                <ProgressRing
                  progress={completionPercent}
                  courseTitle={firstCourseName || "Chưa có khóa học"}
                  courseLink={
                    firstCourseId
                      ? `/courses/${encodeURIComponent(firstCourseId)}/lessons/overview`
                      : "/courses"
                  }
                />
              </div>
            </div>

            <div className="lg:hidden">
              <ProgressRing
                progress={completionPercent}
                courseTitle={firstCourseName || "Chưa có khóa học"}
                courseLink={
                  firstCourseId
                    ? `/courses/${encodeURIComponent(firstCourseId)}/lessons/overview`
                    : "/courses"
                }
              />
            </div>

            {/* Phần tiếp tục học */}
            <div className="w-full">
              <ContinueLearning />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
