import { User } from "lucide-react";
import type { LessonDetail } from "@/data/types";

interface MentorSidebarProps {
  lesson: LessonDetail;
}

export function MentorSidebar({ lesson }: MentorSidebarProps) {
  if (lesson.mentors.length === 0) {
    return (
      <div className="px-6 py-4">
        <h3 className="mb-4 text-[15px] font-bold text-foreground">
          Giảng viên
        </h3>
        <p className="text-sm text-muted-foreground italic">
          Chưa có thông tin giảng viên cho bài học này.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <h3 className="mb-4 text-[15px] font-bold text-foreground">
        Giảng viên
      </h3>
      <div className="space-y-4">
        {lesson.mentors.map((mentor, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Mentor Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden">
              {mentor.avatar ? (
                <img
                  src={mentor.avatar}
                  alt={mentor.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            {/* Mentor Info */}
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate">
                {mentor.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {mentor.role}
                {mentor.company && ` • ${mentor.company}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
