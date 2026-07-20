import { useState } from "react";
import DOMPurify from "dompurify";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, BookOpen, Info, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNotifications, useMarkAllRead, useMarkNotificationRead } from "@/hooks/useNotifications";
import type { Notification } from "@/data/types";
import { cn } from "@/lib/utils";
import { AssignmentFeedbackNotificationDialog } from "./AssignmentFeedbackNotificationDialog";

const ICON_MAP: Record<Notification["icon"], React.ElementType> = {
  badge: Shield,
  course: BookOpen,
  system: Info,
};

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationModal({ open, onOpenChange }: NotificationModalProps) {
  const [feedbackNotification, setFeedbackNotification] = useState<Notification | null>(null);
  const { notifications, isLoading, unreadCount } = useNotifications();
  const markAllRead = useMarkAllRead();
  const markNotificationRead = useMarkNotificationRead();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markNotificationRead.mutate(notification.id);
    }
    if (notification.type === "assignment_feedback") {
      setFeedbackNotification(notification);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-lg flex-col gap-0 overflow-hidden p-0 focus:outline-none sm:max-h-[85vh] sm:w-full"
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const dialogContent = event.currentTarget as HTMLElement | null;
          requestAnimationFrame(() => {
            dialogContent?.focus({ preventScroll: true });
          });
        }}
      >
        {/* Header */}
        <DialogHeader className="border-b border-border bg-muted/10 px-4 pb-3 pl-4 pr-12 pt-5 text-left sm:px-5 sm:pr-12">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <DialogTitle className="text-base">Tất cả thông báo</DialogTitle>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {unreadCount} chưa đọc
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-0 text-xs text-muted-foreground hover:text-primary sm:px-2"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đánh dấu đã đọc
              </Button>
            )}
          </div>
          <DialogDescription className="text-left text-xs">
            Các thông báo cập nhật từ khóa học và hệ thống
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
          {/* Skeleton Loading */}
          {isLoading && (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Bell className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Chưa có thông báo nào
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Thông báo mới sẽ xuất hiện ở đây
              </p>
            </div>
          )}

          {/* Notification List */}
          {!isLoading && notifications.length > 0 && (
            <AnimatePresence>
              <div className="flex flex-col divide-y divide-border/50">
                {notifications.map((notification, index) => {
                  const Icon = ICON_MAP[notification.icon] || Info;
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.03 * index }}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "flex gap-3 px-5 py-3.5 hover:bg-muted/50 cursor-pointer transition-colors",
                        !notification.read && "bg-primary/[0.03]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5",
                          !notification.read
                            ? "bg-primary/10"
                            : "bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            !notification.read
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <p
                            className={cn(
                              "text-[13px] leading-tight",
                              !notification.read
                                ? "font-semibold text-foreground"
                                : "font-medium text-muted-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <div
                          className="text-[12px] text-muted-foreground leading-snug overflow-x-auto custom-scrollbar
                                     [&>p]:m-0 [&>p>strong]:text-foreground [&>p>strong]:font-semibold
                                     [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_table]:text-xs [&_table]:text-left
                                     [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:bg-muted/50 [&_th]:font-semibold
                                     [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(notification.message),
                          }}
                        />
                        <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                          {notification.time}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AssignmentFeedbackNotificationDialog
      notification={feedbackNotification}
      open={!!feedbackNotification}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setFeedbackNotification(null);
      }}
    />
    </>
  );
}
