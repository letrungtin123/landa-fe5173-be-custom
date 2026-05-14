import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import WelcomePicture from "@/assets/CompleteCourseModal/WelcomePicture.png";
import { ArrowRight } from "lucide-react";
import type { CourseModalConfigData } from "@/api/modalConfig";
import { useAppStore } from "@/stores/useAppStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCourseModalState, updateCourseModalState } from "@/api/modalState";

interface WelcomeCourseModalProps {
  courseId: string;
  completionPercent: number;
  isLoading?: boolean;
  config?: CourseModalConfigData;
}

export function WelcomeCourseModal({ courseId, completionPercent, isLoading, config }: WelcomeCourseModalProps) {
  const [open, setOpen] = useState(false);
  const setCourseModalActive = useAppStore((s) => s.setCourseModalActive);

  const isEnabled = config?.welcome_enabled === true;

  useEffect(() => {
    setCourseModalActive(open);
    return () => setCourseModalActive(false);
  }, [open, setCourseModalActive]);

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

    const isShown = modalState.welcome_shown;

    // Show only when completion is 0%, enabled, and not shown before
    if (!isShown && completionPercent === 0 && isEnabled) {
      setOpen(true);
    }
  }, [courseId, isLoading, completionPercent, isEnabled, config, isModalStateLoading, modalState]);

  const handleContinue = () => {
    updateState({ welcome_shown: true });
    setOpen(false);
  };

  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      const BASE_WIDTH = 600;
      const BASE_HEIGHT = 460;
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
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent
        className="w-auto max-w-none p-0 border-none overflow-visible bg-transparent shadow-none [&>button]:hidden outline-none flex items-center justify-center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div 
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="relative w-[600px] bg-background rounded-3xl shadow-2xl flex flex-col items-center overflow-visible"
        >
          {/* Header Image */}
          <div className="w-full bg-[#E5EDFF] dark:bg-[#1a2d59] rounded-t-3xl pt-6 pb-0 flex justify-center items-end relative overflow-hidden h-[240px] shrink-0">
            <img
              src={WelcomePicture}
              alt="Welcome"
              className="w-[70%] max-w-[340px] h-auto object-contain object-bottom translate-y-[5%]"
            />
          </div>

          {/* Content */}
          <div className="px-10 pt-6 pb-10 flex flex-col items-center text-center w-full shrink-0">
            <h2 className="text-[28px] font-bold text-foreground mb-3 tracking-tight">
              {config?.welcome_title || 'Chào mừng bạn đến với khóa học!'}
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-8 max-w-[500px]">
              {config?.welcome_description || 'Chúc bạn có những trải nghiệm học tập thật bổ ích và thú vị.'}
            </p>

            {/* Button */}
            <Button
              onClick={handleContinue}
              className="rounded-full px-10 py-6 text-[16px] font-semibold gap-2 transition-all duration-300 w-auto min-w-[220px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40"
            >
              Tiếp tục học <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
