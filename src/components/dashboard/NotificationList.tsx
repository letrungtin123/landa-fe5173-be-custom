import { motion } from "framer-motion";
import { Shield, BookOpen, Info } from "lucide-react";
import { mockNotifications, type Notification } from "@/data/mock";

const ICON_MAP: Record<Notification["icon"], React.ElementType> = {
  badge: Shield,
  course: BookOpen,
  system: Info,
};

export function NotificationList() {
  return (
    <div>
      <h2 className="mb-6 text-[17px] font-bold text-foreground">Thông báo</h2>

      <div className="space-y-6">
        {mockNotifications.map((notification, index) => {
          const Icon = ICON_MAP[notification.icon];
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
    </div>
  );
}
