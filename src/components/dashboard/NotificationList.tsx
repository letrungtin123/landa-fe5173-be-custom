import { motion } from "framer-motion";
import { Shield, BookOpen, Info, Bell, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/data/types";

const ICON_MAP: Record<Notification["icon"], React.ElementType> = {
  badge: Shield,
  course: BookOpen,
  system: Info,
};

export function NotificationList() {
  const { notifications, isLoading } = useNotifications();

  return (
    <div>
      <h2 className="mb-6 text-[17px] font-bold text-foreground">Thông báo</h2>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && notifications.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-6 text-center"
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-[13px] text-muted-foreground">
            Chưa có thông báo mới
          </p>
        </motion.div>
      )}

      {/* Notification Items */}
      {notifications.length > 0 && (
        <div className="space-y-6">
          {notifications.map((notification, index) => {
            const Icon = ICON_MAP[notification.icon] || Info;
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className="flex items-start gap-4 transition-colors cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                  <Icon className="h-[20px] w-[20px] text-primary stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] font-bold text-foreground mb-[3px]">
                    {notification.title}
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-snug">
                    {notification.message}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
