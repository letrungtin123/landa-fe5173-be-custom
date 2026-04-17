import { Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockLessons } from "@/data/mock";
import { useAppStore } from "@/stores/useAppStore";

export function SlideContent() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const lesson = mockLessons[currentLessonId] || mockLessons["l-m3-1"];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      {/* Header Area */}
      <div className="mb-6 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-success/20 text-success hover:bg-success/30 font-bold text-xs uppercase tracking-wider px-3 py-1">
            {lesson.moduleTag}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {lesson.lessonNumber}
          </span>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-primary leading-none mb-1">
            1/8
          </div>
          <div className="text-[11px] font-bold text-foreground uppercase tracking-wide">
            Trang
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {lesson.title}
        </h1>
        <Volume2 className="h-7 w-7 text-foreground" />
      </div>

      {/* Document / Slide Area */}
      <div className="w-full rounded-[24px] border border-border bg-white dark:bg-card p-8 md:p-12 shadow-sm min-h-[600px] flex items-start justify-center">
        {/* Mock Graphic or Text for the slide */}
        {lesson.slideData ? (
          <div className="w-full">
            <h2 className="text-2xl font-bold text-destructive uppercase mb-10">{lesson.slideData.title}</h2>
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border/50">
               <img src={lesson.slideData.imageUrl} alt="Document slide" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex items-center justify-center h-full">
            No document available.
          </div>
        )}
      </div>
    </div>
  );
}
