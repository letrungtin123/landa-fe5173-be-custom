// ============================================================
// DashboardPage — Trang chính learner (dữ liệu thật từ API)
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { ContinueLearning } from "@/components/dashboard/ContinueLearning";
import { RecommendedSection } from "@/components/dashboard/RecommendedSection";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useMyEnrollments, useCourses } from "@/hooks/useCourses";
import { useAverageCourseCompletion } from "@/hooks/useProgress";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  clearDemoIframeDashboardCtaPending,
  DEMO_IFRAME_DASHBOARD_CTA_EVENT,
  DEMO_IFRAME_COMPANION_WIDGET_EVENT,
  demoIframeCompanionWidgetKey,
  demoIframeDashboardCtaKey,
  isDemoIframeDashboardCtaPending,
  markDemoIframeCompanionWidgetPending,
  setDemoIframeFlowLock,
} from "@/utils/demoIframeDashboardGuide";
import { lockDemoIframeUserScroll } from "@/utils/demoIframeGuideLock";

const DEMO_IFRAME_FLOW_LOCK_DASHBOARD_CTA = "dashboard-cta";

export function DashboardPage() {
  const { isLoading: pageLoading } = usePageLoading(1000);
  const { data: enrollments } = useMyEnrollments();
  const { data: courseList } = useCourses();
  const sessionMode = useAuthStore((s) => s.sessionMode);
  const userId = useAuthStore((s) => s.user?.id);
  const loginSessionId = useAuthStore((s) => s.loginSessionId);
  const isDemoIframe = sessionMode === "demo_iframe";
  const demoCtaGuideKey = useMemo(
    () => demoIframeDashboardCtaKey(userId, loginSessionId),
    [loginSessionId, userId]
  );
  const demoCompanionWidgetKey = useMemo(
    () => demoIframeCompanionWidgetKey(userId, loginSessionId),
    [loginSessionId, userId]
  );
  const [demoCtaGuideActive, setDemoCtaGuideActive] = useState(false);

  // Chỉ lấy enrollment có course trong danh sách public (đã filter bởi BE)
  const publicCourseIds = new Set((courseList?.data || []).map((c: any) => c.id));
  const visibleEnrollments = (enrollments || []).filter(
    (e: any) => publicCourseIds.has(e.course_id)
  );

  // Lấy danh sách ID của tất cả khóa học đang enrolled
  const enrolledCourseIds = visibleEnrollments.map((e: any) => e.course_id);
  const { data: averagePercent } = useAverageCourseCompletion(enrolledCourseIds);

  useEffect(() => {
    if (!isDemoIframe || !demoCtaGuideKey) {
      setDemoCtaGuideActive(false);
      return;
    }

    if (isDemoIframeDashboardCtaPending(demoCtaGuideKey)) {
      setDemoCtaGuideActive(true);
    }

    const handleGuideReady = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key && detail.key !== demoCtaGuideKey) return;
      setDemoCtaGuideActive(true);
    };

    window.addEventListener(DEMO_IFRAME_DASHBOARD_CTA_EVENT, handleGuideReady);
    return () => {
      window.removeEventListener(DEMO_IFRAME_DASHBOARD_CTA_EVENT, handleGuideReady);
    };
  }, [demoCtaGuideKey, isDemoIframe]);

  const handleDemoCtaClick = useCallback(() => {
    clearDemoIframeDashboardCtaPending(demoCtaGuideKey);
    if (isDemoIframe && demoCompanionWidgetKey) {
      markDemoIframeCompanionWidgetPending(demoCompanionWidgetKey);
      window.dispatchEvent(
        new CustomEvent(DEMO_IFRAME_COMPANION_WIDGET_EVENT, {
          detail: { key: demoCompanionWidgetKey },
        })
      );
    }
    setDemoCtaGuideActive(false);
  }, [demoCompanionWidgetKey, demoCtaGuideKey, isDemoIframe]);

  useEffect(() => {
    if (!demoCtaGuideActive) return;
    setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_DASHBOARD_CTA, true);
    const unlockScroll = lockDemoIframeUserScroll({ lockOverflow: false });

    return () => {
      setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_DASHBOARD_CTA, false);
      unlockScroll();
    };
  }, [demoCtaGuideActive]);

  if (pageLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {demoCtaGuideActive && typeof document !== "undefined"
        ? createPortal(
          <div
            className="demo-iframe-dark-lock-overlay fixed inset-0 z-[99970] cursor-default"
            aria-hidden="true"
          />,
          document.body
        )
        : null}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-[1420px] px-4 pb-8 pt-4 md:px-8 lg:pt-0 xl:px-10"
      >
        <div className="flex flex-col lg:flex-row">
          {/* Thanh bên trái */}
          <div className="hidden lg:block w-full lg:w-[280px] shrink-0 lg:border-r lg:border-border lg:pr-12 pt-8">
            <div className="sticky top-24 space-y-10 self-start pb-8">
              <UserProfileCard />
              <BadgeShowcase />
            </div>
          </div>

          {/* Nội dung chính */}
          <div className="flex-1 min-w-0 lg:pl-12 mt-2 lg:mt-0 pt-2 lg:pt-8 space-y-10">
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
                  progress={averagePercent}
                  courseTitle="Tất cả khóa học"
                  courseLink="/explore"
                />
              </div>
            </div>

            {/* <div className="hidden">
              <ProgressRing
                progress={averagePercent}
                courseTitle="Tất cả khóa học"
                courseLink="/explore"
              />
            </div> */}

            {/* Phần tiếp tục học */}
            <div className="w-full">
              <ContinueLearning />
            </div>

            {/* Đề xuất dành cho bạn */}
            <div className="w-full pb-8">
              <RecommendedSection
                demoCtaGuideActive={demoCtaGuideActive}
                onDemoCtaGuideClick={handleDemoCtaClick}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
