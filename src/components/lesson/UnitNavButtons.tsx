// ============================================================
// UnitNavButtons — Nút "Quay lại" & "Tiếp tục" giữa các Unit
// Bám sát layout Figma, dùng theme tokens
// ============================================================

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

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
}: UnitNavButtonsProps) {
  const isFirst = currentIndex === 0;

  return (
    <div className="mt-8 flex items-center justify-between">
      {/* Quay lại */}
      <button
        onClick={onPrev}
        disabled={isFirst}
        className={`flex w-[140px] items-center justify-start gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition-all ${
          isFirst
            ? "text-muted-foreground/40 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.97]"
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>

      {/* Indicator */}
      <span className="text-[13px] text-muted-foreground font-medium flex-1 text-center">
        {currentIndex + 1} / {totalUnits}
      </span>

      {/* Tiếp tục / Hoàn thành */}
      <div className="flex justify-end">
        {isLastUnit ? (
          hideCompleteButton ? null : (
            <button
              onClick={onComplete}
              disabled={isCompleting || isCompleted}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-bold shadow-sm transition-all whitespace-nowrap ${
                isCompleted
                  ? "bg-green-600 text-white cursor-default opacity-90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50"
              }`}
            >
              {isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isCompleted ? "Đã hoàn thành" : "Hoàn thành"}
            </button>
          )
        ) : (
          <button
            onClick={onNext}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[14px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
          >
            Tiếp tục
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
