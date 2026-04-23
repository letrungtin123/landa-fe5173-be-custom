import type { LessonDetail } from "@/data/types";

interface LearningObjectivesProps {
  lesson: LessonDetail;
}

export function LearningObjectives({ lesson }: LearningObjectivesProps) {
  if (lesson.objectives.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">
        Mục tiêu bài học
      </h2>
      <ul className="space-y-3">
        {lesson.objectives.map((obj, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span className="text-sm leading-relaxed text-muted-foreground">
              {obj}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
