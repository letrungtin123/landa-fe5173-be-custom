import type { LessonDetail } from "@/data/types";

interface LessonIntroProps {
  lesson: LessonDetail;
}

export function LessonIntro({ lesson }: LessonIntroProps) {
  if (!lesson.description && lesson.bulletPoints.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">
        Giới thiệu bài học
      </h2>
      {lesson.description && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {lesson.description}
        </p>
      )}
      {lesson.bulletPoints.length > 0 && (
        <ul className="space-y-3">
          {lesson.bulletPoints.map((bp, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <div>
                <span className="font-semibold text-foreground">{bp.label}</span>{" "}
                <span className="text-muted-foreground">{bp.text}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
