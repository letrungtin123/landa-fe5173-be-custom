import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VideoCompleteFinal from "@/assets/CompleteCourseModal/VideoCompleteFinal.gif";
import { useNavigate } from "react-router-dom";

interface Course100PercentModalProps {
  courseId: string;
  completionPercent: number;
}

const Confetti = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Left side particles */}
    <div className="absolute top-[15%] left-[10%] w-3 h-3 rounded-full bg-pink-500"></div>
    <div className="absolute top-[25%] left-[5%] w-2 h-2 rounded-full bg-white opacity-80"></div>
    <div className="absolute top-[45%] left-[12%] w-[12px] h-[24px] bg-yellow-400 rotate-45 opacity-90"></div>
    <div className="absolute top-[65%] left-[8%] w-[10px] h-[20px] bg-pink-500 rotate-12"></div>
    <div className="absolute top-[80%] left-[18%] w-2 h-2 rounded-full bg-white opacity-60"></div>
    <div className="absolute top-[35%] left-[22%] w-3 h-3 bg-[#4ade80] rotate-45"></div>
    <div className="absolute top-[50%] left-[28%] w-2 h-2 rounded-full bg-white"></div>
    
    {/* Right side particles */}
    <div className="absolute top-[10%] right-[15%] w-2 h-2 rounded-full bg-pink-500"></div>
    <div className="absolute top-[25%] right-[25%] w-2 h-2 rounded-full bg-white opacity-90"></div>
    <div className="absolute top-[40%] right-[12%] w-[12px] h-[20px] bg-pink-400 -rotate-12"></div>
    <div className="absolute top-[60%] right-[6%] w-[15px] h-[10px] bg-yellow-400 -rotate-45"></div>
    <div className="absolute top-[85%] right-[20%] w-2 h-2 rounded-full bg-white opacity-70"></div>
    <div className="absolute top-[35%] right-[32%] w-2 h-6 bg-[#34d399] rotate-12"></div>
    <div className="absolute top-[20%] right-[5%] w-1.5 h-1.5 rounded-full bg-white"></div>

    {/* Center/Top particles */}
    <div className="absolute top-[12%] left-[45%] w-2 h-2 rounded-full bg-white opacity-80"></div>
    <div className="absolute top-[18%] right-[35%] w-[10px] h-[6px] bg-pink-400 rotate-45"></div>
    <div className="absolute top-[8%] right-[42%] w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
    
    {/* Wavy ribbons */}
    <svg className="absolute top-[20%] right-[18%] w-10 h-10 text-[#34d399] opacity-80 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4c-3 0-5 2-5 5s2 5 5 5 5 2 5 5-2 5-5 5"/></svg>
    <svg className="absolute top-[45%] left-[18%] w-8 h-8 text-[#4ade80] opacity-60 -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4c-3 0-5 2-5 5s2 5 5 5 5 2 5 5-2 5-5 5"/></svg>
  </div>
);

export function Course100PercentModal({ courseId, completionPercent }: Course100PercentModalProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) return;
    
    // Check condition for 100% and not shown yet
    if (completionPercent === 100) {
      const hasShown = localStorage.getItem(`course_100_shown_${courseId}`);
      if (!hasShown) {
        const timer = setTimeout(() => {
          setOpen(true);
          localStorage.setItem(`course_100_shown_${courseId}`, "true");
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [courseId, completionPercent]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="w-screen h-screen max-w-none m-0 p-0 border-none bg-background overflow-hidden rounded-none shadow-none [&>button]:hidden z-[100] flex flex-col"
      >
        {/* Nửa trên nền xanh */}
        <div className="relative w-full h-[55vh] min-h-[420px] bg-[#4F88FF] dark:bg-primary flex flex-col items-center justify-center pt-8 pb-20 overflow-hidden">
          <Confetti />
          
          <h1 className="text-white text-[32px] sm:text-[42px] font-medium mb-3 z-10 tracking-wide mt-[-5vh]">
            Congratulations!
          </h1>
          <p className="text-white/90 text-center max-w-[500px] text-[13px] sm:text-[14px] px-6 mb-8 z-10 leading-relaxed font-light">
            Trở thành đối tác chiến lược giúp khách hàng tối ưu hiệu suất <br /> nhân lực để phát triển bền vững.
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
