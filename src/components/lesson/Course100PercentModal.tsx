import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import CompleteBGModalMobile from "@/assets/CompleteCourseModal/CompleteBGModalMobile.png";
import CompleteBGModalPC from "@/assets/CompleteCourseModal/CompleteBGModalPC.png";
import CompleteModalHat from "@/assets/CompleteCourseModal/CompleteModalHat.png";
import CompleteModalPencil from "@/assets/CompleteCourseModal/CompleteModalPencil.png";
import CompleteModalTrophy from "@/assets/CompleteCourseModal/CompleteModalTrophy.png";
import FacebookIcon from "@/assets/SocialIcon/facebook.png";
import ZaloIcon from "@/assets/SocialIcon/zalo.png";
import InstagramIcon from "@/assets/SocialIcon/instagram.png";
import { useNavigate } from "react-router-dom";
import type { CourseModalConfigData } from "@/api/modalConfig";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
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
  const sessionMode = useAuthStore((s) => s.sessionMode);

  // Nếu admin tắt completion modal → không render
  const isEnabled = config?.completion_enabled === true;
  const requiresConfirm = config?.confirm_enabled === true;
  const [isPending, setIsPending] = useState(false);

  const socialIcon = useMemo(() => {
    switch (config?.completion_social_type) {
      case "facebook": return FacebookIcon;
      case "zaloOA": return ZaloIcon;
      case "instagram": return InstagramIcon;
      default: return null;
    }
  }, [config?.completion_social_type]);

  const [pcScale, setPcScale] = useState(1);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 945;
      // Use Math.min so the foreground elements always fit inside the screen uniformly without squeezing.
      // The background image will be separated to object-fill the entire screen.
      setPcScale(Math.min(scaleX, scaleY));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  useEffect(() => {
    setCourseModalActive(open || isPending);
    return () => setCourseModalActive(false);
  }, [open, isPending, setCourseModalActive]);

  const queryClient = useQueryClient();

  const { data: modalState, isLoading: isModalStateLoading } = useQuery({
    queryKey: ["courseModalState", courseId, sessionMode],
    queryFn: () => getCourseModalState(courseId),
    enabled: !!courseId && !isLoading,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: updateState } = useMutation({
    mutationFn: (updates: { welcome_shown?: boolean; confirm_shown?: boolean; complete_shown?: boolean }) => 
      updateCourseModalState(courseId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(["courseModalState", courseId, sessionMode], data);
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
        className="w-screen h-screen max-w-none m-0 p-0 border-none bg-background md:bg-transparent overflow-hidden rounded-none shadow-none [&>button]:hidden z-[100] flex flex-col justify-center items-center"
      >
        {/* Background Image (object-fill to cover screen without bars) */}
        <div className="absolute inset-0 w-full h-full -z-20 bg-[#7cb0f7] overflow-hidden">
          <img src={CompleteBGModalPC} className="hidden md:block absolute inset-0 w-full h-full object-fill" alt="bg-pc" />
          <img src={CompleteBGModalMobile} className="block md:hidden absolute inset-0 w-full h-full object-fill" alt="bg-mobile" />
        </div>

        {/* Confetti Effect */}
        <Confetti />

        {/* PC Foreground Wrapper (Uniform scale to prevent squeezing) */}
        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-10 overflow-hidden">
          <div 
            className="relative flex-shrink-0 origin-center"
            style={{ 
              width: '1920px', 
              height: '945px', 
              transform: `scale(${pcScale})` 
            }}
          >
            {/* PC 3D ICONS (Fixed px, anchored to center of 1920x945) */}
            <motion.div 
              className="absolute top-1/2 left-1/2 mt-[-80px]"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <img 
                src={CompleteModalTrophy} 
                alt="Trophy PC" 
                className="absolute w-[360px] max-w-none ml-[-40px] mt-[-100px] drop-shadow-2xl z-20"
              />
              <img 
                src={CompleteModalHat} 
                alt="Hat PC" 
                className="absolute w-[290px] max-w-none ml-[-320px] mt-[-320px] drop-shadow-xl z-10"
              />
              <img 
                src={CompleteModalPencil} 
                alt="Pencil PC" 
                className="absolute w-[150px] max-w-none ml-[-320px] mt-[65px] drop-shadow-xl z-30"
              />
            </motion.div>

            {/* PC Text Area (Fixed px, anchored to center of 1920x945) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-[200px] w-full max-w-[800px] flex-col items-center justify-start z-20 flex pointer-events-auto">
              <h1 className="text-foreground text-[42px] font-bold mb-3 tracking-tight">
                {config?.completion_title || 'Congratulations!'}
              </h1>
              <p className="text-foreground/80 font-medium text-[16px] max-w-[600px] text-center leading-relaxed mb-8 px-4">
                {config?.completion_description || 'Trở thành đối tác chiến lược giúp khách hàng tối ưu hiệu suất nhân lực để phát triển bền vững.'}
              </p>

              <div className="flex flex-row items-center justify-center gap-4">
                <Button onClick={() => { setOpen(false); navigate("/dashboard"); }} className="bg-[#0057e7] hover:bg-[#0046b8] text-white rounded-full px-10 py-6 text-[15px] font-semibold shadow-md">
                  Trang chủ
                </Button>
                <Button onClick={() => { setOpen(false); navigate("/explore"); }} variant="outline" className="rounded-full px-10 py-6 text-[15px] font-semibold bg-transparent border-muted-foreground/30 text-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground">
                  Các khoá học khác
                </Button>
                {config?.completion_social_link && (
                  <a
                    href={config.completion_social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center justify-center gap-3 h-[48px] pl-1.5 pr-6 rounded-full bg-white shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out shrink-0"
                    aria-label="Social Link"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 border border-slate-100 shadow-inner overflow-hidden">
                      {config.completion_social_type === 'website' ? (
                        <Upload className="w-4 h-4 text-sky-500 group-hover:scale-110 group-hover:text-sky-600 transition-all duration-300" />
                      ) : socialIcon ? (
                        <img src={socialIcon} alt="Social Icon" className="w-[18px] h-[18px] object-contain group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
                      ) : null}
                    </div>
                    <span className="font-bold text-[14px] text-slate-700 group-hover:text-blue-700 transition-colors">
                      {config.completion_social_type === 'zaloOA' ? 'Zalo OA' :
                       config.completion_social_type === 'facebook' ? 'Facebook' :
                       config.completion_social_type === 'instagram' ? 'Instagram' : 'Website'}
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE 3D ICONS */}
        <motion.div 
          className="md:hidden absolute top-1/2 left-1/2 z-30 pointer-events-none mt-[-100px]"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <img 
            src={CompleteModalTrophy} 
            alt="Trophy" 
            className="absolute w-[220px] max-w-none ml-[-60px] mt-[-60px] drop-shadow-2xl z-20"
          />
          <img 
            src={CompleteModalHat} 
            alt="Hat" 
            className="absolute w-[180px] max-w-none ml-[-180px] mt-[-240px] drop-shadow-xl z-10"
          />
          <img 
            src={CompleteModalPencil} 
            alt="Pencil" 
            className="absolute w-[90px] max-w-none ml-[-160px] mt-[80px] drop-shadow-xl z-30"
          />
        </motion.div>

        {/* Mobile White Card */}
        <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 mt-[60px] w-[90vw] max-w-[400px] bg-card rounded-[28px] p-6 z-20 shadow-2xl flex flex-col items-center text-center">
          <h1 className="text-[#0062ff] dark:text-primary text-[24px] font-bold mb-2">
            {config?.completion_title || 'Congratulations!'}
          </h1>
          <p className="text-foreground text-[14px] leading-relaxed mb-6 font-medium px-2">
            {config?.completion_description || 'Trở thành đối tác chiến lược giúp khách hàng tối ưu hiệu suất nhân lực để phát triển bền vững.'}
          </p>
          <div className="flex flex-row items-center justify-center gap-2 w-full">
            <Button onClick={() => { setOpen(false); navigate("/dashboard"); }} className="bg-[#0062ff] dark:bg-primary hover:bg-[#0052cc] text-white rounded-full px-5 h-11 text-[13px] font-semibold flex-shrink-0">
              Trang chủ
            </Button>
            <Button onClick={() => { setOpen(false); navigate("/explore"); }} variant="outline" className="rounded-full px-4 h-11 text-[13px] font-semibold flex-1 border-muted-foreground/30 text-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground">
              Các khoá học khác
            </Button>
            {config?.completion_social_link && (
              <a
                href={config.completion_social_link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center h-11 w-11 rounded-full bg-white shadow-md border border-slate-100 shrink-0 hover:bg-slate-50 transition-colors"
                aria-label="Social Link"
              >
                {config.completion_social_type === 'website' ? (
                  <Upload className="w-4 h-4 text-sky-500" />
                ) : socialIcon ? (
                  <img src={socialIcon} alt="Social Icon" className="w-[18px] h-[18px] object-contain" />
                ) : null}
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
