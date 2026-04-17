import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mockLessons } from "@/data/mock";
import { useAppStore } from "@/stores/useAppStore";

export function QuizContent() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const lesson = mockLessons[currentLessonId] || mockLessons["l-m1-5"];
  const quiz = lesson.quizData;
  if (!quiz) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Header Area */}
      <div className="mb-2 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-success text-success-foreground hover:bg-success/90 font-bold text-xs uppercase tracking-wider px-3 py-1">
            {lesson.moduleTag}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {lesson.lessonNumber}
          </span>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-primary leading-none mb-1">
            1/5
          </div>
          <div className="text-[11px] font-bold text-foreground">
            Câu hỏi đã hoàn thành
          </div>
        </div>
      </div>

      <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-[32px]">
        {lesson.title}
      </h1>

      {/* Progress Bar */}
      <div className="mb-10 flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[20%] rounded-full bg-primary" />
      </div>

      {/* Quiz Card */}
      <div className="rounded-[32px] border border-border/60 bg-card p-6 md:p-10 shadow-[0_2px_20px_rgb(0,0,0,0.02)]">
        <h2 className="mb-8 text-2xl font-bold leading-[1.4] text-foreground">
          {quiz.question}
        </h2>

        <div className="flex flex-col gap-4">
          {quiz.options.map((opt) => (
            <button
              key={opt.id}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                opt.selected
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-transparent bg-[#F9FAFB] dark:bg-muted/40 hover:border-border hover:bg-muted"
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] font-bold text-[17px]",
                  opt.selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-white dark:bg-card text-foreground shadow-sm border border-border/40"
                )}
              >
                {opt.letter}
              </div>
              <p className="flex-1 text-[15px] font-[600] leading-snug text-foreground">
                {opt.text}
              </p>
              {opt.selected && (
                <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
