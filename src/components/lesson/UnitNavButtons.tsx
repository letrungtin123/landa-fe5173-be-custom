// ============================================================
// UnitNavButtons — Nút "Quay lại" & "Tiếp tục" giữa các Unit
// Bám sát layout Figma, dùng theme tokens
// ============================================================

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Check } from "lucide-react";

interface UnitNavButtonsProps {
  currentIndex: number;
  totalUnits: number;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
  isCompleting?: boolean;
  isCompleted?: boolean;
  isLastUnit: boolean;
  hideCompleteButton?: boolean;
  onNextLesson?: () => void;
  hasNextLesson?: boolean;
}

export function UnitNavButtons({
  currentIndex,
  totalUnits,
  onPrev,
  onNext,
  onComplete,
  isCompleting = false,
  isCompleted = false,
  isLastUnit,
  hideCompleteButton = false,
  onNextLesson,
  hasNextLesson = false,
}: UnitNavButtonsProps) {
  const isFirst = currentIndex === 0;

  return (
    <div className="mt-8 flex items-center justify-between">
      {/* Quay lại */}
      <button
        onClick={onPrev}
        disabled={isFirst}
        className={`flex w-[140px] items-center justify-start gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold leading-[18px] transition-all ${
          isFirst
            ? "text-muted-foreground/40 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.97]"
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>

      {/* Indicator */}
      <span className="text-[14px] font-normal leading-[18px] text-muted-foreground flex-1 text-center">
        {currentIndex + 1} / {totalUnits}
      </span>

      {/* Tiếp tục / Hoàn thành */}
      <div className="flex justify-end gap-3">
        {isLastUnit ? (
          <>
            {/* Nút Hoàn thành / Đã hoàn thành */}
            {/* Nếu hideCompleteButton = true (bài quiz), ẩn lúc chưa complete để user phải làm bài, nhưng khi làm xong (isCompleted=true) thì hiện Đã hoàn thành */}
            {!(hideCompleteButton && !isCompleted) && (
              isCompleted ? (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 px-4 py-2.5">
                  <Check className="h-5 w-5 stroke-[3]" />
                  <span className="text-[14px] font-bold">Đã hoàn thành</span>
                </div>
              ) : (
                <button
                  onClick={onComplete}
                  disabled={isCompleting || hideCompleteButton}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[14px] font-semibold leading-[18px] text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 whitespace-nowrap"
                >
                  {isCompleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Hoàn thành
                </button>
              )
            )}

            {isCompleted && hasNextLesson && (
              <button
                onClick={onNextLesson}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[14px] font-semibold leading-[18px] text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
              >
                Tiếp tục học
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onNext}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[14px] font-semibold leading-[18px] text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
          >
            Tiếp tục
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
