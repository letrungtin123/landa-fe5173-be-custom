// ============================================================
// QuizRightSidebar — Thanh bên phải cho quiz, hiển thị recap + mentor
// ============================================================

import { Badge } from "@/components/ui/badge";
import { MentorSidebar } from "./MentorSidebar";
import type { LessonDetail } from "@/data/types";

interface QuizRightSidebarProps {
  lesson: LessonDetail;
}

export function QuizRightSidebar({ lesson }: QuizRightSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pb-8">
        {/* Khối tóm tắt bài học */}
        <div className="mb-8 rounded-3xl bg-[#F6F8FB] dark:bg-card p-6 shadow-sm border border-transparent dark:border-border/50">
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-transparent font-bold text-[11px] mb-5 tracking-widest px-3 py-1 rounded-full uppercase">
            Tóm tắt bài học
          </Badge>
          <p className="mb-5 text-[13px] font-bold leading-relaxed text-foreground">
            {lesson.description || "Hãy hoàn thành quiz để kiểm tra kiến thức đã học trong bài."}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {lesson.moduleTag} • {lesson.lessonNumber}
          </p>
        </div>

        {/* Mentor Section */}
        <MentorSidebar lesson={lesson} />
      </div>
    </div>
  );
}
