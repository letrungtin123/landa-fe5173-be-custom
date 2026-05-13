import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import WelcomePicture from "@/assets/CompleteCourseModal/WelcomePicture.png";
import { ArrowRight } from "lucide-react";
import type { CourseModalConfigData } from "@/api/modalConfig";
import { useAppStore } from "@/stores/useAppStore";

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

  useEffect(() => {
    if (!courseId || isLoading || !config) return;

    const isShown = localStorage.getItem(`course_welcome_shown_${courseId}`);

    // Show only when completion is 0%, enabled, and not shown before
    if (!isShown && completionPercent === 0 && isEnabled) {
      setOpen(true);
    }
  }, [courseId, isLoading, completionPercent, isEnabled, config]);

  const handleContinue = () => {
    localStorage.setItem(`course_welcome_shown_${courseId}`, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent
        className="w-[92vw] max-w-[600px] p-0 border-none overflow-hidden rounded-3xl bg-background shadow-2xl [&>button]:hidden outline-none flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center">
          {/* Header Image */}
          <div className="w-full bg-[#E5EDFF] dark:bg-[#1a2d59] pt-8 pb-0 flex justify-center items-end relative overflow-hidden h-[180px] sm:h-[240px]">
            <img
              src={WelcomePicture}
              alt="Welcome"
              className="w-[70%] max-w-[340px] h-auto object-contain object-bottom translate-y-[5%]"
            />
          </div>

          {/* Content */}
          <div className="px-6 sm:px-10 pt-8 pb-10 flex flex-col items-center text-center w-full">
            <h2 className="text-[22px] sm:text-[28px] font-bold text-foreground mb-3 tracking-tight">
              {config?.welcome_title || 'Chào mừng bạn đến với khóa học!'}
            </h2>
            <p className="text-muted-foreground text-[14px] sm:text-[15px] leading-relaxed mb-8 max-w-[500px]">
              {config?.welcome_description || 'Chúc bạn có những trải nghiệm học tập thật bổ ích và thú vị.'}
            </p>

            {/* Button */}
            <Button
              onClick={handleContinue}
              className="rounded-full px-10 py-5 sm:py-6 text-[15px] sm:text-[16px] font-semibold gap-2 transition-all duration-300 w-full sm:w-auto min-w-[220px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40"
            >
              Tiếp tục học <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
