import { motion } from "framer-motion";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { StreakCounter } from "@/components/dashboard/StreakCounter";
import { NotificationList } from "@/components/dashboard/NotificationList";
import { ContinueLearning } from "@/components/dashboard/ContinueLearning";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { usePageLoading } from "@/hooks/usePageLoading";

export function DashboardPage() {
  const { isLoading } = usePageLoading(1000);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-[1400px] px-4 py-8 md:px-6"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Left Sidebar */}
        <div className="w-full lg:w-[280px] shrink-0 lg:border-r lg:border-border lg:pr-8">
          <div className="sticky top-24 space-y-10">
            <UserProfileCard />
            <NotificationList />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:pl-8 mt-8 lg:mt-0 space-y-10">
          {/* Top Section */}
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Header Area & Momentum */}
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-start">
                <WelcomeBanner />
                <div className="lg:hidden">
                  <StreakCounter />
                </div>
              </div>
            </div>

            {/* Right Stats Column */}
            <div className="hidden lg:flex flex-col gap-6 lg:w-[240px] shrink-0">
              <StreakCounter />
              <ProgressRing />
            </div>
          </div>

          <div className="lg:hidden">
             <ProgressRing />
          </div>

          {/* Bottom Section */}
          <div>
            <ContinueLearning />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
