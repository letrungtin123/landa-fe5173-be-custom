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
import { mockLessons } from "@/data/mock";
import { useAppStore } from "@/stores/useAppStore";

export function LessonDetailPage() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const { isLoading } = usePageLoading(800, currentLessonId);
  
  if (isLoading) {
    return <LessonSkeleton />;
  }

  const lesson = mockLessons[currentLessonId] || mockLessons["l-m2-1"];
  const type = lesson.type || "video";

  return (
    <div className="flex min-h-full w-full">
      {/* Main Content */}
      <div className="flex-1">
        {type === "slide" && <SlideContent />}
        {type === "quiz" && <QuizContent />}
        
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
              <VideoPlayer />
            </div>

            {/* Learning Objectives */}
            <div className="mb-8">
              <LearningObjectives />
            </div>

            {/* Lesson Introduction */}
            <div className="mb-8">
              <LessonIntro />
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar (Hidden for Slide layout) */}
      {type !== "slide" && (
        <div className="hidden xl:block w-[300px] shrink-0 border-l border-border bg-background pt-6">
          {type === "quiz" ? (
            <QuizRightSidebar />
          ) : (
            <div className="flex flex-col h-full">
              <MentorSidebar />
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
