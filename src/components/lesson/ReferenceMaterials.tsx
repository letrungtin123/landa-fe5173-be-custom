// ============================================================
// ReferenceMaterials — Khu vực tải tài liệu tham khảo
// Hiện tại hiển thị thông tin, không có API download (Open edX
// không có Library API chuẩn cho static files)
// ============================================================

import { motion } from "framer-motion";
import { FileText, ExternalLink } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";
import { config } from "@/config/env";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

export function ReferenceMaterials() {
  const { colorStyle } = useThemeStore();
  const isStaff = useAuthStore((s) => s.user?.isStaff);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <div
        className={cn(
          "mt-6 rounded-xl p-6 text-white",
          colorStyle === "gradient"
            ? "accent-surface-gradient"
            : "bg-primary"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5" />
          <h3 className="text-lg font-bold">Tài liệu tham khảo</h3>
        </div>
        <p className="mb-4 text-sm text-white/80">
          Tài liệu học tập bổ sung có sẵn trên hệ thống LMS.
        </p>

        {/* Link đến LMS để xem tài liệu */}
        {isStaff && (
          <a
            href={`${config.studioBaseUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30"
          >
            <ExternalLink className="h-4 w-4" />
            Quản lý tài liệu
          </a>
        )}
      </div>
    </motion.div>
  );
}
