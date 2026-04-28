// ============================================================
// DashboardPage — Trang chính learner (dữ liệu thật từ API)
// ============================================================

import { motion } from "framer-motion";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { StreakCounter } from "@/components/dashboard/StreakCounter";
import { NotificationList } from "@/components/dashboard/NotificationList";
import { ContinueLearning } from "@/components/dashboard/ContinueLearning";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useCourseCompletion } from "@/hooks/useProgress";

export function DashboardPage() {
  const { isLoading: pageLoading } = usePageLoading(1000);
  const { data: enrollments } = useMyEnrollments();

  // Lấy khóa học đầu tiên đang enrolled để hiển thị tiến độ
  const firstCourseId = enrollments?.[0]?.course_details.course_id;
  const firstCourseName = enrollments?.[0]?.course_details.course_name;
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
      className="mx-auto max-w-[1400px] px-4 py-8 md:px-6"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Thanh bên trái */}
        <div className="w-full lg:w-[280px] shrink-0 lg:border-r lg:border-border lg:pr-8">
          <div className="sticky top-24 space-y-10">
            <UserProfileCard />
            <BadgeShowcase />
            <NotificationList />
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="flex-1 lg:pl-8 mt-8 lg:mt-0 space-y-10">
          {/* Phần trên */}
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Banner chào mừng */}
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-start">
                <WelcomeBanner />
                <div className="lg:hidden">
                  <StreakCounter />
                </div>
              </div>
            </div>

            {/* Cột thống kê bên phải */}
            <div className="hidden lg:flex flex-col gap-6 lg:w-[240px] shrink-0">
              <StreakCounter />
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
          <div>
            <ContinueLearning />
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}
