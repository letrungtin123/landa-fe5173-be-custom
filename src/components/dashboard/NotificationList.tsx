import { useState } from "react";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { Shield, BookOpen, Info, Bell, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationModal } from "./NotificationModal";
import type { Notification } from "@/data/types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<Notification["icon"], React.ElementType> = {
  badge: Shield,
  course: BookOpen,
  system: Info,
};

const MAX_PREVIEW = 2;

export function NotificationList() {
  const { notifications, isLoading, unreadCount } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[17px] font-bold text-foreground">Thông báo</h2>
        {unreadCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            {unreadCount} mới
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="h-11 w-11 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
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

      {/* Notification Items — show only 2 latest */}
      {notifications.length > 0 && (
        <div className="space-y-5">
          {notifications.slice(0, MAX_PREVIEW).map((notification, index) => {
            const Icon = ICON_MAP[notification.icon] || Info;
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className={cn(
                  "flex items-start gap-4 transition-colors cursor-pointer rounded-lg p-2 -mx-2",
                  !notification.read && "bg-primary/[0.03]"
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  !notification.read ? "bg-primary/10 dark:bg-primary/20" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-[20px] w-[20px] stroke-[2]",
                    !notification.read ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-baseline gap-2 mb-[3px]">
                    <p className={cn(
                      "text-[13px]",
                      !notification.read ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                    )}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <div 
                    className="text-[13px] text-muted-foreground leading-snug line-clamp-2
                               [&>p]:m-0 [&>p>strong]:text-foreground [&>p>strong]:font-semibold
                               [&_table]:hidden"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notification.message) }}
                  />
                  <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* View All Button */}
          <Button
            variant="ghost"
            className="w-full text-xs h-9 gap-1.5 text-muted-foreground hover:text-primary"
            onClick={() => setModalOpen(true)}
          >
            Xem tất cả thông báo
            {notifications.length > MAX_PREVIEW && (
              <span className="text-muted-foreground/60">({notifications.length})</span>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Full Notification Modal */}
      <NotificationModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
