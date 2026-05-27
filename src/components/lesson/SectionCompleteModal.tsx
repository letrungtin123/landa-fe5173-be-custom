import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSectionModalConfigs, getSectionModalShown, markSectionModalShown } from "@/api/sectionModalConfig";
import type { Module } from "@/data/types";
import { useAppStore } from "@/stores/useAppStore";

// ── Confetti Animation ──
const Confetti = () => {
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f97316"];
  const particles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 3,
      size: 5 + Math.random() * 5,
      rotateEnd: 360 + Math.random() * 360,
      xOffset: (Math.random() - 0.5) * 80,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
      <style>
        {particles
          .map(
            (p) => `
          @keyframes section-confetti-${p.id} {
            0% { transform: translate3d(0, -20px, 0) rotate(0deg); }
            100% { transform: translate3d(${p.xOffset}px, 100vh, 0) rotate(${p.rotateEnd}deg); }
          }
        `
          )
          .join("")}
      </style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm shadow-sm"
          style={{
            left: `${p.x}%`,
            top: 0,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
            animation: `section-confetti-${p.id} ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

// ── Main Component ──

interface SectionCompleteModalProps {
  courseId: string;
  modules: Module[];
}

export function SectionCompleteModal({ courseId, modules }: SectionCompleteModalProps) {
  const [open, setOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<{ section_id: string; title: string; description: string } | null>(null);
  const queryClient = useQueryClient();
  const setCourseModalActive = useAppStore((s) => s.setCourseModalActive);

  // Đồng bộ trạng thái modal với hệ thống isCourseModalActive
  useEffect(() => {
    setCourseModalActive(open);
    return () => setCourseModalActive(false);
  }, [open, setCourseModalActive]);

  // Lấy config các section được bật modal khích lệ
  const { data: configs } = useQuery({
    queryKey: ["sectionModalConfigs", courseId],
    queryFn: () => getSectionModalConfigs(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  // Lấy danh sách section đã xem popup
  const { data: shownData } = useQuery({
    queryKey: ["sectionModalShown", courseId],
    queryFn: () => getSectionModalShown(courseId),
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });

  // Mutation đánh dấu đã xem
  const { mutate: markShown } = useMutation({
    mutationFn: (sectionId: string) => markSectionModalShown(courseId, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectionModalShown", courseId] });
    },
  });

  // Detect khi 1 section vừa hoàn thành
  useEffect(() => {
    if (!configs || configs.length === 0 || !shownData || !modules || modules.length === 0) return;

    const shownSet = new Set(shownData.shown_sections);
    const configMap = new Map(configs.map(c => [c.section_id, c]));

    for (const mod of modules) {
      // Chỉ xét các section đã hoàn thành + có config + chưa xem
      if (mod.completed && configMap.has(mod.id) && !shownSet.has(mod.id)) {
        const cfg = configMap.get(mod.id)!;
        setCurrentConfig(cfg);
        setOpen(true);
        return; // Chỉ show 1 cái tại 1 thời điểm
      }
    }
  }, [configs, shownData, modules]);

  const handleDismiss = () => {
    if (currentConfig) {
      markShown(currentConfig.section_id);
    }
    setOpen(false);
    setCurrentConfig(null);
  };

  if (!currentConfig) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent
        className="w-auto max-w-none p-0 border-none overflow-visible bg-transparent shadow-none [&>button]:hidden outline-none flex items-center justify-center"
      >
        <div className="relative w-[520px] bg-background rounded-3xl shadow-2xl flex flex-col items-center overflow-hidden">
          {/* Header xanh gradient + Confetti */}
          <div className="relative w-full bg-gradient-to-br from-[#4F88FF] via-[#6366f1] to-[#8b5cf6] pt-10 pb-14 flex flex-col items-center justify-center overflow-hidden">
            <Confetti />
            <div className="z-10 flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-white text-[28px] font-bold z-10 tracking-tight text-center px-6">
              {currentConfig.title || "Xuất sắc!"}
            </h1>
          </div>

          {/* Content */}
          <div className="px-10 pt-8 pb-10 flex flex-col items-center text-center w-full">
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-8 max-w-[420px]">
              {currentConfig.description || "Bạn đã hoàn thành phần học này. Hãy tiếp tục chinh phục những nội dung tiếp theo!"}
            </p>

            <Button
              onClick={handleDismiss}
              className="rounded-full px-10 py-6 text-[16px] font-semibold gap-2 transition-all duration-300 w-auto min-w-[220px] bg-gradient-to-r from-[#4F88FF] to-[#6366f1] hover:from-[#3b6fde] hover:to-[#5558e3] text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40"
            >
              Tiếp tục học <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
