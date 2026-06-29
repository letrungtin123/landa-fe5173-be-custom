import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmPicture from "@/assets/CompleteCourseModal/ConfirmPicture.png";
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

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent
        className="w-auto max-w-none p-0 border-none overflow-visible bg-transparent shadow-none [&>button]:hidden outline-none flex items-center justify-center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div
          className="w-[88vw] md:w-[92vw] max-w-[640px] bg-background rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative"
        >
          {/* Blue top background */}
          <div className="absolute top-0 left-0 right-0 h-[160px] md:h-[260px] bg-primary z-0" />

          {/* Image Overlay */}
          <div className="absolute top-6 md:-top-1 left-0 right-0 md:left-auto w-full md:w-auto h-[170px] md:h-[320px] z-20 flex justify-center md:justify-end pointer-events-none md:right-4">
            <img
              src={ConfirmPicture}
              alt="Confirm"
              className="h-full w-auto object-contain object-bottom md:object-right-bottom"
            />
          </div>

          {/* White Content Card */}
          <div className="w-full bg-background rounded-t-[32px] relative z-10 flex flex-col px-5 py-6 md:px-10 mt-[120px] md:mt-[220px]">
            {/* Text Content */}
            <div className="pt-[70px] md:pt-0 md:w-[65%] flex flex-col">
              <h2 className="text-[21px] md:text-[28px] font-medium text-primary mb-2 md:mb-3 text-left tracking-tight">
                {config?.confirm_title || 'Hoàn thành khóa học!'}
              </h2>
              <p className="text-[13px] md:text-[15px] text-muted-foreground leading-relaxed mb-5 md:mb-8 text-left">
                {config?.confirm_description || 'Cảm ơn bạn đã nỗ lực hoàn thành chương trình đào tạo để cùng xây dựng những giá trị cốt lõi tại công ty.'}
              </p>
            </div>

            {/* Dotted line */}
            <div className="w-full border-t border-dashed border-border/80 mb-5 md:mb-6" />

            {/* Checkbox and Button Row */}
            <div className="flex flex-row items-center justify-between gap-3 md:gap-4 text-left">

              {/* Checkbox & Text Container */}
              <div className="flex flex-col flex-1 pr-1 md:pr-4">
                <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                    />
                    <div className="w-5 h-5 rounded-[6px] border-2 border-muted-foreground/40 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-all bg-background">
                      {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <span className="text-[14px] md:text-[14.5px] font-medium text-foreground select-none leading-snug">
                    <span className="md:hidden">Xác nhận</span>
                    <span className="hidden md:inline">
                      {config?.confirm_checkbox_text || 'Xác nhận tôi đã hoàn thành khóa học và nắm vững các nội dung đào tạo.'}
                    </span>
                  </span>
                </label>

                {/* Mobile italic text placed BELOW the checkbox and ALIGNED LEFT */}
                <span
                  className="md:hidden text-[12.5px] text-muted-foreground italic leading-snug mt-1.5 pr-2 select-none cursor-pointer"
                  onClick={() => setChecked(!checked)}
                >
                  {config?.confirm_checkbox_text || 'Tôi đã hoàn thành khóa học và nắm vững các nội dung đào tạo.'}
                </span>
              </div>

              <Button
                disabled={!checked}
                onClick={handleContinue}
                className={cn(
                  "rounded-full px-5 py-5 md:px-6 md:py-5 text-[14px] md:text-[14.5px] font-semibold transition-all duration-300 shrink-0",
                  checked
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Tiếp tục <ArrowRight className="hidden md:inline-block w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
