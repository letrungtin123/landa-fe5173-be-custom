import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VideoCompleteFinal from "@/assets/CompleteCourseModal/VideoCompleteFinal.gif";
import { useNavigate } from "react-router-dom";
import type { CourseModalConfigData } from "@/api/modalConfig";
import { useAppStore } from "@/stores/useAppStore";
import FacebookIcon from "@/assets/SocialIcon/facebook.png";
import InstagramIcon from "@/assets/SocialIcon/instagram.png";
import ZaloIcon from "@/assets/SocialIcon/zalo.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCourseModalState, updateCourseModalState } from "@/api/modalState";

interface Course100PercentModalProps {
  courseId: string;
  completionPercent: number;
  isLoading?: boolean;
  config?: CourseModalConfigData;
}

const Confetti = () => {
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f97316"];
  const particles = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 3,
      size: 6 + Math.random() * 6,
      rotateEnd: 360 + Math.random() * 360,
      xOffset: (Math.random() - 0.5) * 100,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
      <style>
        {particles
          .map(
            (p) => `
          @keyframes confetti-fall-${p.id} {
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
            animation: `confetti-fall-${p.id} ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

export function Course100PercentModal({ courseId, completionPercent, isLoading, config }: Course100PercentModalProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const setCourseModalActive = useAppStore((s) => s.setCourseModalActive);
  const confirmJustClosed = useAppStore((s) => s.confirmJustClosed);
  const setConfirmJustClosed = useAppStore((s) => s.setConfirmJustClosed);

  // Nếu admin tắt completion modal → không render
  const isEnabled = config?.completion_enabled === true;
  const requiresConfirm = config?.confirm_enabled === true;
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setCourseModalActive(open || isPending);
    return () => setCourseModalActive(false);
  }, [open, isPending, setCourseModalActive]);

  const getSocialIcon = () => {
    switch (config?.completion_social_type) {
      case "facebook": return FacebookIcon;
      case "instagram": return InstagramIcon;
      case "zaloOA": return ZaloIcon;
      default: return null;
    }
  };

  const socialIcon = getSocialIcon();

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

    // Reset complete_shown khi progress rớt xuống dưới 100%
    if (completionPercent < 100 && modalState.complete_shown) {
      updateState({ complete_shown: false });
      return;
    }

    // Điều kiện cơ bản: progress = 100%, admin bật, chưa hiện
    const canShow = completionPercent === 100 && isEnabled && !modalState.complete_shown;
    if (!canShow) return;

    // Kiểm tra confirm đã thỏa mãn chưa:
    // - Nếu course KHÔNG bật confirm → thỏa mãn ngay
    // - Nếu course BẬT confirm → cần confirm_shown = true HOẶC confirmJustClosed = true
    const confirmSatisfied = !requiresConfirm || modalState.confirm_shown || confirmJustClosed;
    if (!confirmSatisfied) return;

    setIsPending(true);
    // Delay ngắn nếu confirm vừa đóng (chain nối tiếp), delay dài hơn nếu hiện trực tiếp
    const delay = confirmJustClosed ? 100 : 800;
    const timer = setTimeout(() => {
      setIsPending(false);
      setOpen(true);
      updateState({ complete_shown: true });
      // Reset flag sau khi đã xử lý
      if (confirmJustClosed) {
        setConfirmJustClosed(false);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      setIsPending(false);
    };
  }, [courseId, completionPercent, isLoading, isEnabled, requiresConfirm, confirmJustClosed, config, isModalStateLoading, modalState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="w-screen h-screen max-w-none m-0 p-0 border-none bg-background overflow-hidden rounded-none shadow-none [&>button]:hidden z-[100] flex flex-col"
      >
        {/* Nửa trên nền xanh */}
        <div className="relative w-full h-[55vh] min-h-[420px] bg-[#4F88FF] dark:bg-primary flex flex-col items-center justify-center pt-8 pb-20 overflow-hidden">
          <Confetti />
          
          <h1 className="text-white text-[32px] sm:text-[42px] font-medium mb-3 z-10 tracking-wide mt-[-5vh]">
            {config?.completion_title || 'Congratulations!'}
          </h1>
          <p className="text-white/90 text-center max-w-[500px] text-[13px] sm:text-[14px] px-6 mb-8 z-10 leading-relaxed font-light">
            {config?.completion_description || 'Trở thành đối tác chiến lược giúp khách hàng tối ưu hiệu suất nhân lực để phát triển bền vững.'}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 z-10">
            <Button 
              onClick={() => { setOpen(false); navigate("/dashboard"); }} 
              className="bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full px-8 py-5 sm:py-6 text-[14px] font-medium border-none shadow-none transition-colors"
            >
              Trang chủ
            </Button>
            <Button 
              onClick={() => { setOpen(false); navigate("/explore"); }} 
              variant="outline" 
              className="bg-transparent border border-white/40 text-white hover:bg-white/10 hover:text-white rounded-full px-8 py-5 sm:py-6 text-[14px] font-medium transition-colors shadow-none"
            >
              Các khoá học khác
            </Button>

            {/* Social Link Button */}
            {config?.completion_social_link && (
              <a
                href={config.completion_social_link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center gap-3 h-[48px] sm:h-[52px] pl-1.5 pr-6 rounded-full bg-white shadow-[0_8px_20px_-4px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_30px_-6px_rgba(0,0,0,0.35)] hover:-translate-y-1 transition-all duration-400 ease-out"
                aria-label="Social Link"
              >
                {/* Vòng tròn nhỏ bọc icon */}
                <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 border border-slate-100 shadow-inner overflow-hidden">
                  {config.completion_social_type === 'website' ? (
                    <svg className="w-5 h-5 sm:w-5 sm:h-5 text-sky-500 group-hover:scale-110 group-hover:text-sky-600 group-hover:rotate-3 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  ) : socialIcon ? (
                    <img src={socialIcon} alt="Social Icon" className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] object-contain group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
                  ) : null}
                </div>
                
                {/* Tên Social */}
                <span className="font-bold text-[13px] sm:text-[14px] text-slate-700 group-hover:text-blue-700 transition-colors">
                  {config.completion_social_type === 'zaloOA' ? 'Zalo OA' :
                   config.completion_social_type === 'facebook' ? 'Facebook' :
                   config.completion_social_type === 'instagram' ? 'Instagram' : 'Website'}
                </span>
              </a>
            )}
          </div>

          {/* Đường cong trắng lồi lên từ đáy */}
          <div className="absolute -bottom-[25vw] sm:-bottom-[18vw] left-[-20vw] w-[140vw] h-[35vw] sm:h-[25vw] bg-background rounded-t-[50%] z-0" />
        </div>

        {/* Nửa dưới màu nền trắng (hoặc đen dark mode) */}
        <div className="relative flex-1 bg-background w-full">
          {/* Video Box */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-[100px] sm:-top-[160px] w-[90%] max-w-[700px] z-20 flex items-center justify-center bg-transparent">
            <img 
              src={VideoCompleteFinal} 
              alt="Course Complete"
              className="w-full h-auto object-contain block"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
