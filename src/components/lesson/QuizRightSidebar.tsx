import { Badge } from "@/components/ui/badge";
import { MentorSidebar } from "./MentorSidebar";

export function QuizRightSidebar() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pb-8">
        {/* Lesson Recap Block */}
        <div className="mb-8 rounded-3xl bg-[#F6F8FB] dark:bg-card p-6 shadow-sm border border-transparent dark:border-border/50">
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-transparent font-bold text-[11px] mb-5 tracking-widest px-3 py-1 rounded-full uppercase">
            Lesson Recap
          </Badge>
          <p className="mb-5 text-[13px] font-bold leading-relaxed text-foreground">
            Với định hướng chiến lược dài hạn, L&A Holdings cam kết: Trở thành đối tác chiến lược hàng đầu giúp khách hàng tối ưu hóa hiệu suất nhân lực để đạt được sự phát triển bền vững.
          </p>
          <p className="mb-3 text-[13px] font-bold italic text-foreground">
            (Xem lại phần 1 bài học)
          </p>
          
          {/* Mock image placeholder representing the recap diagram */}
          <div className="w-full rounded-xl bg-white dark:bg-muted/30 border border-border/50 p-2 shadow-sm overflow-hidden flex items-center justify-center min-h-[120px]">
             <img src={"https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&q=80"} alt="Recap diagram" className="w-full h-auto object-cover rounded-md opacity-80" />
          </div>
        </div>

        {/* Mentor Section */}
        <MentorSidebar />
      </div>
    </div>
  );
}
