import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmPicture from "@/assets/CompleteCourseModal/ConfirmPicture.png";
import GraduationHat from "@/assets/CompleteCourseModal/GraduationHat.png";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseModalConfigData } from "@/api/modalConfig";
import { useAppStore } from "@/stores/useAppStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCourseModalState, updateCourseModalState } from "@/api/modalState";

interface CompleteCourseModalProps {
  courseId: string;
  completionPercent: number;
  isLoading?: boolean;
  config?: CourseModalConfigData;
}

export function CompleteCourseModal({ courseId, completionPercent, isLoading, config }: CompleteCourseModalProps) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const setCourseModalActive = useAppStore((s) => s.setCourseModalActive);
  const setConfirmJustClosed = useAppStore((s) => s.setConfirmJustClosed);

  const [isPending, setIsPending] = useState(false);

  const isEnabled = config?.confirm_enabled === true;

  // Chỉ reset confirm_shown 1 lần per session, tránh gọi API thừa
  const hasResetRef = useRef(false);

  useEffect(() => {
    setCourseModalActive(open || isPending);
    return () => setCourseModalActive(false);
  }, [open, isPending, setCourseModalActive]);

  const queryClient = useQueryClient();

  const { data: modalState, isLoading: isModalStateLoading } = useQuery({
    queryKey: ["courseModalState", courseId],
    queryFn: () => getCourseModalState(courseId),
    enabled: !!courseId && !isLoading,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: updateState } = useMutation({
    mutationFn: (updates: { welcome_shown?: boolean; confirm_shown?: boolean; complete_shown?: boolean }) => 
      updateCourseModalState(courseId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(["courseModalState", courseId], data);
    }
  });

  useEffect(() => {
    if (!courseId || isLoading || !config || isModalStateLoading || !modalState) return;
    
    // Reset confirm_shown khi progress rớt dưới 100%, nhưng chỉ 1 lần
    if (completionPercent < 100) {
      if (modalState.confirm_shown && !hasResetRef.current) {
        hasResetRef.current = true;
        updateState({ confirm_shown: false });
      }
      return;
    }

    // Khi đạt 100% lại → cho phép reset lần sau
    hasResetRef.current = false;

    const isConfirmed = modalState.confirm_shown;
    // Chỉ hiển thị modal khi tiến độ = 100%, chưa confirm và admin bật
    if (!isConfirmed && completionPercent === 100 && isEnabled) {
      setIsPending(true);
      // Delay một chút để progress bar kịp chạy tới 100%
      const timer = setTimeout(() => {
        setIsPending(false);
        setOpen(true);
      }, 500);
      return () => {
        clearTimeout(timer);
        setIsPending(false);
      }
    }
  }, [courseId, isLoading, completionPercent, isEnabled, config, isModalStateLoading, modalState]);

  const handleContinue = () => {
    if (!checked) return;
    updateState({ confirm_shown: true });
    setOpen(false);
    // Thông báo cho Complete modal qua Zustand store (thay vì DOM event)
    setConfirmJustClosed(true);
  };

  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      const BASE_WIDTH = 720;
      const BASE_HEIGHT = 580;
      const padding = 32;
      const scaleX = (window.innerWidth - padding) / BASE_WIDTH;
      const scaleY = (window.innerHeight - padding) / BASE_HEIGHT;
      setScale(Math.min(scaleX, scaleY, 1));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="w-auto max-w-none p-0 border-none overflow-visible bg-transparent shadow-none [&>button]:hidden outline-none flex items-center justify-center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div 
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="relative w-[720px] bg-background rounded-3xl shadow-2xl flex flex-col items-center overflow-visible"
        >
          {/* Nón tốt nghiệp */}
          <div className="absolute -top-[45px] -left-[35px] z-50 pointer-events-none">
            <img 
              src={GraduationHat} 
              alt="Hat" 
              className="w-[140px] h-auto drop-shadow-xl" 
            />
          </div>
          
          {/* Header Image */}
          <div className="w-full bg-[#E5EDFF] dark:bg-[#1a2d59] rounded-t-3xl pt-8 pb-0 flex justify-center items-end relative overflow-hidden h-[260px] shrink-0">
            <img 
              src={ConfirmPicture} 
              alt="Confirm" 
              className="w-[75%] max-w-[420px] h-auto object-contain object-bottom translate-y-[8%]" 
            />
          </div>

          {/* Content */}
          <div className="px-12 pt-8 pb-10 flex flex-col items-center text-center w-full shrink-0">
            <h2 className="text-[30px] font-bold text-foreground mb-3 tracking-tight">
              {config?.confirm_title || 'Hoàn thành khóa học!'}
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-6 max-w-[580px]">
              {config?.confirm_description || 'Cảm ơn bạn đã nỗ lực hoàn thành chương trình đào tạo để cùng xây dựng những giá trị cốt lõi tại công ty.'}
            </p>

            {/* Checkbox area */}
            <label className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 px-8 py-4 rounded-xl cursor-pointer hover:bg-red-100/80 dark:hover:bg-red-900/40 transition-colors mb-7 w-[550px]">
              <div className="relative flex items-center justify-center shrink-0 mt-[2px]">
                <input 
                  type="checkbox" 
                  className="peer sr-only"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                <div className="w-[18px] h-[18px] rounded-[4px] border-2 border-red-300 peer-checked:bg-red-500 peer-checked:border-red-500 flex items-center justify-center transition-colors bg-white dark:bg-transparent">
                  {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-[15px] font-medium select-none text-left leading-snug pt-[1px]">
                {config?.confirm_checkbox_text || 'Tôi xác nhận đã hoàn thành khóa học và nắm vững các nội dung đào tạo'}
              </span>
            </label>

            {/* Button */}
            <Button
              disabled={!checked}
              onClick={handleContinue}
              className={cn(
                "rounded-full px-10 py-6 text-[16px] font-semibold gap-2 transition-all duration-300 w-auto min-w-[220px]",
                checked 
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40" 
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Xác nhận & Hoàn thành <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
