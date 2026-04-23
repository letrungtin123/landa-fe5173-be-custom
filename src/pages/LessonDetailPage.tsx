import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { LearningObjectives } from "@/components/lesson/LearningObjectives";
import { LessonIntro } from "@/components/lesson/LessonIntro";
import { MentorSidebar } from "@/components/lesson/MentorSidebar";
import { ReferenceMaterials } from "@/components/lesson/ReferenceMaterials";
import { LessonSkeleton } from "@/components/skeletons/LessonSkeleton";
import { QuizContent } from "@/components/lesson/QuizContent";
import { QuizRightSidebar } from "@/components/lesson/QuizRightSidebar";
import { SlideContent } from "@/components/lesson/SlideContent";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useAppStore } from "@/stores/useAppStore";
import { useLessonDetail } from "@/hooks/useLessonDetail";
import { BookOpen } from "lucide-react";

export function LessonDetailPage() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const { isLoading: pageLoading } = usePageLoading(800, currentLessonId);
  const { lesson, isLoading: dataLoading } = useLessonDetail(currentLessonId);
  
  if (pageLoading || dataLoading) {
    return <LessonSkeleton />;
  }

  // No lesson data available
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-foreground">Nội dung chưa sẵn sàng</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Bài học này chưa có nội dung. Vui lòng chọn bài học khác hoặc liên hệ giảng viên.
        </p>
      </div>
    );
  }

  const type = lesson.type || "video";

  return (
    <div className="flex min-h-full w-full">
      {/* Main Content */}
      <div className="flex-1">
        {type === "slide" && <SlideContent lesson={lesson} />}
        {type === "quiz" && <QuizContent lesson={lesson} />}
        
        {type === "video" && (
          <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
            {/* Module & Lesson Info */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-accent text-accent-foreground font-semibold text-xs uppercase tracking-wider px-3 py-1">
                {lesson.moduleTag}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {lesson.lessonNumber}
              </span>
            </div>

            {/* Lesson Title */}
            <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {lesson.title}
            </h1>

            {/* Video Player */}
            <div className="mb-8">
              <VideoPlayer lesson={lesson} />
            </div>

            {/* Learning Objectives */}
            <div className="mb-8">
              <LearningObjectives lesson={lesson} />
            </div>

            {/* Lesson Introduction */}
            <div className="mb-8">
              <LessonIntro lesson={lesson} />
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar (Hidden for Slide layout) */}
      {type !== "slide" && (
        <div className="hidden xl:block w-[300px] shrink-0 border-l border-border bg-background pt-6">
          {type === "quiz" ? (
            <QuizRightSidebar lesson={lesson} />
          ) : (
            <div className="flex flex-col h-full">
              <MentorSidebar lesson={lesson} />
              <div className="border-t border-border mt-4 pt-6 px-6 pb-8">
                <ReferenceMaterials />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
