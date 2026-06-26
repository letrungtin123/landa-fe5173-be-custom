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
  disableCompleteButton?: boolean;
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
  disableCompleteButton = false,
  onNextLesson,
  hasNextLesson = false,
}: UnitNavButtonsProps) {
  const isFirst = currentIndex === 0;

  return (
    <div className="mt-8 flex items-center justify-between gap-1 sm:gap-3">
      {/* Quay lại */}
      <button
        onClick={onPrev}
        disabled={isFirst}
        className={`flex items-center gap-1 sm:gap-2 rounded-full px-3 sm:px-5 py-2 sm:py-2.5 text-[12px] sm:text-[14px] font-semibold leading-[18px] transition-all shrink-0 min-h-[44px] ${
          isFirst
            ? "text-muted-foreground/40 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.97]"
        }`}
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Quay lại
      </button>

      {/* Indicator */}
      <span className="text-[12px] sm:text-[14px] font-normal leading-[18px] text-muted-foreground text-center shrink-0">
        {currentIndex + 1} / {totalUnits}
      </span>

      {/* Tiếp tục / Hoàn thành */}
      <div className="flex justify-end items-center gap-1.5 sm:gap-3 shrink-0">
        {isLastUnit ? (
          <>
            {/* Nút Hoàn thành / Đã hoàn thành */}
            {/* Nếu hideCompleteButton = true (bài quiz), ẩn lúc chưa complete để user phải làm bài, nhưng khi làm xong (isCompleted=true) thì hiện Đã hoàn thành */}
            {!(hideCompleteButton && !isCompleted) && (
              isCompleted ? (
                <div className="flex items-center gap-1 sm:gap-1.5 text-green-600 dark:text-green-400 px-2 sm:px-4 py-2 sm:py-2.5">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" />
                  <span className="text-[11px] sm:text-[14px] font-bold whitespace-nowrap">Đã hoàn thành</span>
                </div>
              ) : (
                <button
                  onClick={onComplete}
                  disabled={isCompleting || hideCompleteButton || disableCompleteButton}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-[14px] font-semibold leading-[18px] text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] whitespace-nowrap bg-primary ${
                    disableCompleteButton ? 'opacity-50 cursor-not-allowed' : 'disabled:opacity-50'
                  }`}
                >
                  {isCompleting ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  Hoàn thành
                </button>
              )
            )}

            {isCompleted && hasNextLesson && (
              <button
                onClick={onNextLesson}
                className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary px-3 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-[14px] font-semibold leading-[18px] text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] whitespace-nowrap"
              >
                <span className="hidden sm:inline">Tiếp tục học</span>
                <span className="sm:hidden">Tiếp tục</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary px-3 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-[14px] font-semibold leading-[18px] text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] whitespace-nowrap"
          >
            Tiếp tục
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

