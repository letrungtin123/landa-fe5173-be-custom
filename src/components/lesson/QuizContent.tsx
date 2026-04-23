// ============================================================
// QuizContent — Hiển thị quiz từ XBlock + nộp câu trả lời
// Sử dụng DOMPurify cho nội dung HTML từ Open edX
// ============================================================

import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getSequenceContent } from "@/api/blocks";
import { useSubmitQuiz, parseQuizResult } from "@/hooks/useQuiz";
import type { LessonDetail } from "@/data/types";

interface QuizContentProps {
  lesson: LessonDetail;
}

export function QuizContent({ lesson }: QuizContentProps) {
  const usageKey = lesson._problemUsageKey;
  const [xblockHtml, setXblockHtml] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Nộp bài qua API
  const submit = useSubmitQuiz(usageKey || "");
  const [selectedId, setSelectedId] = useState<string | null>(
    lesson.quizData?.options.find((o) => o.selected)?.id ?? null
  );
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Tải nội dung quiz từ XBlock API (nếu không có quizData local)
  useEffect(() => {
    if (!lesson.id || lesson.quizData) return;

    setIsLoadingContent(true);
    // Dùng Courseware Sequence API (thay cho /xblock/ bị 404)
    getSequenceContent(lesson.id)
      .then((res) => {
        const allHtml = res.items
          ?.map((item) => item.content || "")
          .join("\n") || "";
        const clean = DOMPurify.sanitize(allHtml, {
          FORBID_TAGS: ["script", "style"],
          FORBID_ATTR: ["onerror", "onload", "onclick"],
        });
        setXblockHtml(clean);
      })
      .catch(() => {
        // Lỗi tải → để trống
      })
      .finally(() => setIsLoadingContent(false));
  }, [usageKey, lesson.quizData]);

  // Xử lý nộp bài
  const handleSubmit = async () => {
    if (!selectedId || !usageKey) return;

    try {
      const response = await submit.mutateAsync({ [usageKey]: selectedId });
      const result = parseQuizResult(response);
      setResultMessage(result.message);
      setIsCorrect(result.correct);
    } catch {
      setResultMessage("Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.");
      setIsCorrect(false);
    }
  };

  const quiz = lesson.quizData;

  // Trường hợp không có quiz data VÀ không có XBlock
  if (!quiz && !usageKey) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <span className="text-2xl">📝</span>
        </div>
        <h2 className="mb-2 text-lg font-bold text-foreground">
          Quiz chưa sẵn sàng
        </h2>
        <p className="text-sm text-muted-foreground">
          Bài kiểm tra này chưa có nội dung. Vui lòng quay lại sau.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      {/* Thông tin Module & Bài học */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className="bg-accent text-accent-foreground font-semibold text-xs uppercase tracking-wider px-3 py-1">
          {lesson.moduleTag}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {lesson.lessonNumber}
        </span>
      </div>

      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {lesson.title}
      </h1>

      {/* Đang tải nội dung XBlock */}
      {isLoadingContent && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      )}

      {/* Nội dung XBlock HTML (khi không có quizData local) */}
      {xblockHtml && !quiz && (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: xblockHtml }}
          />
        </div>
      )}

      {/* Quiz với options (khi có quizData) */}
      {quiz && (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <p className="mb-6 text-[15px] font-semibold text-foreground leading-relaxed">
            {quiz.question}
          </p>

          {/* Các lựa chọn */}
          <div className="space-y-3">
            {quiz.options.map((option) => {
              const isSelected = selectedId === option.id;
              const isDisabled = resultMessage !== null;
              return (
                <button
                  key={option.id}
                  onClick={() => !isDisabled && setSelectedId(option.id)}
                  disabled={isDisabled}
                  className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  } ${isDisabled ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {option.letter}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground pt-0.5">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kết quả sau khi nộp */}
          {resultMessage && (
            <div
              className={`mt-6 flex items-center gap-3 rounded-xl p-4 ${
                isCorrect
                  ? "bg-success/10 border border-success/20"
                  : "bg-destructive/10 border border-destructive/20"
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <p className="text-sm font-medium">{resultMessage}</p>
            </div>
          )}

          {/* Nút nộp bài */}
          {!resultMessage && (
            <div className="mt-6 flex justify-end">
              <button
                disabled={!selectedId || submit.isPending}
                onClick={handleSubmit}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center gap-2"
              >
                {submit.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Xác nhận
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
