import { motion } from "framer-motion";
import { Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

export function ReferenceMaterials() {
  const { colorStyle } = useThemeStore();

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
        <h3 className="mb-2 text-lg font-bold">Tài liệu tham khảo</h3>
        <p className="mb-4 text-sm text-white/80">
          Tải xuống tài liệu học tập bổ sung cho bài học này.
        </p>
        <Button
          variant="secondary"
          className="gap-2 bg-white/20 text-white hover:bg-white/30 border-0"
        >
          <Download className="h-4 w-4" />
          Download Assets
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
