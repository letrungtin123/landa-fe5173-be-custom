import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { CheckCircle2, ChevronLeft, ChevronRight, Info, Lightbulb, Loader2, XCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { submitMediaQuizAnswer } from "@/api/blocks";
import { markBlockComplete } from "@/api/progress";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBlockSubmitStore } from "@/stores/useBlockSubmitStore";
import {
  normalizeMediaQuizData,
  resolveMediaQuizMediaUrl,
  type MediaQuizData,
  type MediaQuizQuestion,
} from "@/lib/mediaQuiz";

interface MediaQuizContentProps {
  usageKey: string;
  mediaQuizData: MediaQuizData;
  onImageClick?: (src: string) => void;
}

type MediaQuizAnswer = string | string[];

function answerHasValue(answer: MediaQuizAnswer | undefined): boolean {
  return Array.isArray(answer) ? answer.length > 0 : !!answer;
}

function isChoiceSelected(answer: MediaQuizAnswer | undefined, choiceId: string): boolean {
  return Array.isArray(answer) ? answer.includes(choiceId) : answer === choiceId;
}

function buildMediaQuizFingerprint(quiz: MediaQuizData): string {
  return JSON.stringify(
    quiz.questions.map(question => ({
      id: question.id,
      mode: question.mode,
      prompt_html: question.prompt_html,
      explanation_html: question.explanation_html || "",
      hints: question.hints || [],
      media_type: question.media?.type || "",
      media_path: question.media?.storage_path || "",
      choices: question.choices.map(choice => ({
        id: choice.id,
        html: choice.html,
      })),
    })),
  );
}

function renderQuestionMedia(question: MediaQuizQuestion, onImageClick?: (src: string) => void) {
  if (!question.media?.storage_path) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Media của câu hỏi này chưa sẵn sàng.
      </div>
    );
  }

  const mediaUrl = resolveMediaQuizMediaUrl(question.media.storage_path);
  if (question.media.type === "video") {
    return (
      <div className="overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg">
        <video src={mediaUrl} controls className="h-full w-full object-contain" preload="metadata" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-muted/20 flex items-center justify-center border border-border shadow-sm p-4 cursor-zoom-in"
      onClick={() => onImageClick?.(mediaUrl)}
    >
      <img
        src={mediaUrl}
        alt={question.media.alt || "Ảnh câu hỏi kèm media"}
        className="max-h-[450px] w-full object-contain"
      />
    </div>
  );
}

function renderQuestionMediaCarousel(
  question: MediaQuizQuestion,
  options: {
    canGoPrevious: boolean;
    canGoNext: boolean;
    showNavigation: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onImageClick?: (src: string) => void;
  },
) {
  const renderNavigation = () => {
    if (!options.showNavigation) return null;
    return (
      <>
        <button
          type="button"
          disabled={!options.canGoPrevious}
          onClick={(event) => {
            event.stopPropagation();
            if (options.canGoPrevious) options.onPrevious();
          }}
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg transition-all hover:bg-black/65 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Media trước"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          disabled={!options.canGoNext}
          onClick={(event) => {
            event.stopPropagation();
            if (options.canGoNext) options.onNext();
          }}
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg transition-all hover:bg-black/65 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Media tiếp theo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </>
    );
  };

  if (!question.media?.storage_path) {
    return (
      <div className="relative rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Media của câu hỏi này chưa sẵn sàng.
        {renderNavigation()}
      </div>
    );
  }

  const mediaUrl = resolveMediaQuizMediaUrl(question.media.storage_path);
  if (question.media.type === "video") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg">
        <video src={mediaUrl} controls className="h-full w-full object-contain" preload="metadata" />
        {renderNavigation()}
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-muted/20 flex items-center justify-center border border-border shadow-sm p-4 cursor-zoom-in"
      onClick={() => options.onImageClick?.(mediaUrl)}
    >
      <img
        src={mediaUrl}
        alt={question.media.alt || "Ảnh câu hỏi kèm media"}
        className="max-h-[450px] w-full object-contain"
      />
      {renderNavigation()}
    </div>
  );
}

export function MediaQuizContent({ usageKey, mediaQuizData, onImageClick }: MediaQuizContentProps) {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const quiz = useMemo(() => normalizeMediaQuizData(mediaQuizData), [mediaQuizData]);
  const contentFingerprint = useMemo(() => buildMediaQuizFingerprint(quiz), [quiz]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, MediaQuizAnswer>>({});
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [blockCompleted, setBlockCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [explanationHtml, setExplanationHtml] = useState("");
  const [submittedQuestionId, setSubmittedQuestionId] = useState<string | null>(null);

  const saveSubmitState = (state: {
    resultMessage: string;
    isCorrect: boolean;
    answers: Record<string, MediaQuizAnswer>;
    activeIndex: number;
    completedQuestionIds: Set<string>;
    blockCompleted: boolean;
    explanationHtml?: string;
  }) => {
    useBlockSubmitStore.getState().setResult(usageKey, {
      resultMessage: state.resultMessage,
      isCorrect: state.isCorrect,
      answers: { ...state.answers },
      explanationHtml: state.explanationHtml || undefined,
      contentFingerprint,
      activeIndex: state.activeIndex,
      completedQuestionIds: Array.from(state.completedQuestionIds),
      blockCompleted: state.blockCompleted,
    });
  };

  useEffect(() => {
    const cached = useBlockSubmitStore.getState().getResult(usageKey);
    if (cached && cached.contentFingerprint === contentFingerprint) {
      const safeActiveIndex = Math.max(0, Math.min(cached.activeIndex ?? 0, Math.max(quiz.questions.length - 1, 0)));
      setActiveIndex(safeActiveIndex);
      setAnswers((cached.answers || {}) as Record<string, MediaQuizAnswer>);
      setCompletedQuestionIds(new Set(cached.completedQuestionIds || []));
      setBlockCompleted(cached.blockCompleted === true);
      setResultMessage(cached.resultMessage || null);
      setIsCorrect(cached.resultMessage && typeof cached.isCorrect === "boolean" ? cached.isCorrect : null);
      setExplanationHtml(cached.explanationHtml || "");
      setSubmittedQuestionId(cached.resultMessage ? quiz.questions[safeActiveIndex]?.id || null : null);
    } else {
      if (cached) {
        useBlockSubmitStore.getState().setResult(usageKey, undefined as any);
      }
      setActiveIndex(0);
      setAnswers({});
      setCompletedQuestionIds(new Set());
      setResultMessage(null);
      setIsCorrect(null);
      setBlockCompleted(false);
      setShowHint(false);
      setExplanationHtml("");
      setSubmittedQuestionId(null);
    }
  }, [usageKey, contentFingerprint, quiz.questions.length]);

  const currentQuestion = quiz.questions[activeIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentHints = currentQuestion?.hints?.filter(hint => hint.trim().length > 0) ?? [];
  const currentExplanationHtml = submittedQuestionId === currentQuestion?.id
    ? (explanationHtml || currentQuestion.explanation_html || "")
    : "";

  const submitMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: MediaQuizAnswer }) =>
      submitMediaQuizAnswer(usageKey, questionId, answer),
    onSuccess: async (data, variables) => {
      const correct = data.status === "correct";
      const answeredIndex = quiz.questions.findIndex(question => question.id === variables.questionId);
      const answeredQuestion = quiz.questions[answeredIndex];
      const isLast = data.completed === true || answeredIndex >= quiz.questions.length - 1;
      const nextAnswers = { ...answers, [variables.questionId]: variables.answer };
      const nextCompletedQuestionIds = new Set(completedQuestionIds);
      if (correct) nextCompletedQuestionIds.add(variables.questionId);
      const nextBlockCompleted = correct && isLast;
      const responseExplanation = typeof data.explanation_html === "string" ? data.explanation_html : "";
      const nextExplanationHtml = correct ? (responseExplanation || answeredQuestion?.explanation_html || "") : "";
      const nextResultMessage = correct
        ? (isLast ? "Chính xác! Bạn đã hoàn thành phần này." : "Chính xác! Bạn có thể xem câu tiếp theo.")
        : "Chưa đúng, hãy thử lại.";

      setIsCorrect(correct);
      setResultMessage(nextResultMessage);
      setAnswers(nextAnswers);
      setShowHint(false);
      setSubmittedQuestionId(variables.questionId);
      setExplanationHtml(nextExplanationHtml);
      setCompletedQuestionIds(nextCompletedQuestionIds);
      setBlockCompleted(nextBlockCompleted);

      saveSubmitState({
        resultMessage: nextResultMessage,
        isCorrect: correct,
        answers: nextAnswers,
        activeIndex: answeredIndex >= 0 ? answeredIndex : activeIndex,
        completedQuestionIds: nextCompletedQuestionIds,
        blockCompleted: nextBlockCompleted,
        explanationHtml: nextExplanationHtml,
      });

      if (!correct) return;

      if (isLast) {
        if (courseId && user?.username) {
          try {
            await markBlockComplete(courseId, usageKey);
            refetchProgressWithRetry(qc, courseId);
          } catch (error) {
            console.error("Failed to mark media quiz complete:", error);
          }
        }
        return;
      }
    },
    onError: () => {
      const nextResultMessage = "Chưa thể gửi câu trả lời lúc này.";
      setIsCorrect(false);
      setResultMessage(nextResultMessage);
      if (currentQuestion) {
        saveSubmitState({
          resultMessage: nextResultMessage,
          isCorrect: false,
          answers,
          activeIndex,
          completedQuestionIds,
          blockCompleted,
        });
      }
    },
  });

  if (!currentQuestion) {
    return (
      <div className="w-full py-12 text-center">
        <h2 className="mb-2 text-lg font-bold text-foreground">Câu hỏi kèm media chưa sẵn sàng</h2>
        <p className="text-sm text-muted-foreground">Component này chưa có câu hỏi.</p>
      </div>
    );
  }

  const setAnswer = (questionId: string, choiceId: string, checked?: boolean) => {
    setResultMessage(null);
    setIsCorrect(null);
    setShowHint(false);
    setExplanationHtml("");
    setSubmittedQuestionId(null);
    setAnswers(prev => {
      const questionMode = quiz.questions.find(question => question.id === questionId)?.mode ?? quiz.mode;
      if (questionMode === "multiple_select") {
        const current = Array.isArray(prev[questionId]) ? prev[questionId] as string[] : [];
        return {
          ...prev,
          [questionId]: checked
            ? Array.from(new Set([...current, choiceId]))
            : current.filter(id => id !== choiceId),
        };
      }
      return { ...prev, [questionId]: choiceId };
    });
  };

  const handleSubmit = () => {
    if (!currentQuestion || !answerHasValue(currentAnswer)) return;
    submitMutation.mutate({ questionId: currentQuestion.id, answer: currentAnswer });
  };

  const handleRetry = () => {
    if (!currentQuestion) return;
    const nextAnswers = { ...answers };
    delete nextAnswers[currentQuestion.id];
    setAnswers(nextAnswers);
    setResultMessage(null);
    setIsCorrect(null);
    setShowHint(false);
    setExplanationHtml("");
    setSubmittedQuestionId(null);
    saveSubmitState({
      resultMessage: "",
      isCorrect: false,
      answers: nextAnswers,
      activeIndex,
      completedQuestionIds,
      blockCompleted,
    });
  };

  const navigateToQuestion = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, quiz.questions.length - 1));
    const nextQuestion = quiz.questions[boundedIndex];
    if (!nextQuestion) return;

    const nextQuestionCompleted = completedQuestionIds.has(nextQuestion.id);
    const nextResultMessage = nextQuestionCompleted
      ? (boundedIndex >= quiz.questions.length - 1 && blockCompleted
        ? "Chính xác! Bạn đã hoàn thành phần này."
        : "Chính xác! Bạn có thể xem câu tiếp theo.")
      : "";

    setActiveIndex(boundedIndex);
    setResultMessage(null);
    setIsCorrect(null);
    setShowHint(false);
    setExplanationHtml(nextQuestionCompleted ? (nextQuestion.explanation_html || "") : "");
    setSubmittedQuestionId(nextQuestionCompleted ? nextQuestion.id : null);
    if (nextQuestionCompleted) {
      setResultMessage(nextResultMessage);
      setIsCorrect(true);
    }
    saveSubmitState({
      resultMessage: nextResultMessage,
      isCorrect: nextQuestionCompleted,
      answers,
      activeIndex: boundedIndex,
      completedQuestionIds,
      blockCompleted,
      explanationHtml: nextQuestionCompleted ? (nextQuestion.explanation_html || "") : undefined,
    });
  };

  const handleToggleHint = () => {
    setShowHint(prev => !prev);
  };

  const canGoPreviousMedia = activeIndex > 0;
  const canGoNextMedia = activeIndex < quiz.questions.length - 1 && completedQuestionIds.has(currentQuestion.id);

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[20px] font-bold text-foreground">
              Câu hỏi {activeIndex + 1}/{quiz.questions.length}
            </div>
          </div>
        </div>

        <div className="mb-8">
          {renderQuestionMediaCarousel(currentQuestion, {
            canGoPrevious: canGoPreviousMedia,
            canGoNext: canGoNextMedia,
            showNavigation: quiz.questions.length > 1,
            onPrevious: () => navigateToQuestion(activeIndex - 1),
            onNext: () => navigateToQuestion(activeIndex + 1),
            onImageClick,
          })}
        </div>

        <div
          className="mb-8 text-[20px] md:text-[24px] font-bold leading-snug text-foreground"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQuestion.prompt_html) }}
        />

        <div className="mb-4 flex items-center gap-2 text-[14px] font-medium text-muted-foreground bg-muted/30 w-fit px-3 py-1.5 rounded-md border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span>
            {currentQuestion.mode === "multiple_select"
              ? "Chọn tất cả đáp án đúng để mở media tiếp theo."
              : "Chọn một đáp án đúng để mở media tiếp theo."}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {currentQuestion.choices.map((choice, index) => {
            const selected = isChoiceSelected(currentAnswer, choice.id);
            const locked = submitMutation.isPending || blockCompleted || !!resultMessage;
            const labelLetter = String.fromCharCode(65 + index);
            const isLastOddChoice = currentQuestion.choices.length % 2 === 1 && index === currentQuestion.choices.length - 1;
            return (
              <label
                key={choice.id}
                className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl p-4 text-left transition-all ${
                  resultMessage && selected
                    ? (isCorrect ? "bg-success/5 ring-1 ring-success" : "bg-destructive/5 ring-1 ring-destructive")
                    : selected
                      ? "bg-primary/5 ring-1 ring-primary"
                      : "bg-muted/40 hover:bg-muted/80"
                } ${locked ? "cursor-default opacity-90" : ""} ${isLastOddChoice ? "sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.5rem)]" : ""}`}
              >
                <input
                  type={currentQuestion.mode === "multiple_select" ? "checkbox" : "radio"}
                  name={currentQuestion.id}
                  value={choice.id}
                  checked={selected}
                  disabled={locked}
                  onChange={(event) => setAnswer(currentQuestion.id, choice.id, event.target.checked)}
                  className="hidden"
                />
                <div
                  className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-[16px] font-bold transition-colors ${
                    resultMessage && selected
                      ? (isCorrect ? "bg-success text-white" : "bg-destructive text-destructive-foreground")
                      : selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground shadow-sm"
                  }`}
                >
                  {labelLetter}
                </div>
                <span
                  className="flex-1 text-[15px] font-medium leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(choice.html) }}
                />
                {selected && (
                  resultMessage && !isCorrect
                    ? <XCircle className="h-6 w-6 shrink-0 text-destructive" />
                    : <CheckCircle2 className={`h-6 w-6 shrink-0 ${resultMessage ? "text-success" : "text-primary"}`} />
                )}
              </label>
            );
          })}
        </div>

        {showHint && currentHints.length > 0 && (
          <div className="mt-4 rounded-xl bg-warning/10 border border-warning/20 p-5">
            <div className="flex items-center gap-2 mb-3 text-warning">
              <Lightbulb className="h-5 w-5" />
              <span className="font-bold text-sm tracking-wide uppercase">Gợi ý</span>
            </div>
            <div className="space-y-3">
              {currentHints.map((hint, index) => (
                <div key={`${currentQuestion.id}-hint-${index}`} className="prose prose-sm prose-warning dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90">
                  <div className="font-semibold">Gợi ý {index + 1}:</div>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hint) }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {resultMessage && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-xl p-4 ${
              isCorrect
                ? "bg-success/10 border border-success/20"
                : "bg-destructive/10 border border-destructive/20"
            }`}
          >
            {isCorrect ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
            <span className="text-sm font-medium text-foreground">{resultMessage}</span>
          </div>
        )}

        {resultMessage && isCorrect === true && currentExplanationHtml && (
          <div className="mt-4 rounded-xl bg-success/10 border border-success/20 p-5">
            <div className="flex items-center gap-2 mb-3 text-success">
              <Info className="h-5 w-5" />
              <span className="font-bold text-sm tracking-wide uppercase">Giải thích</span>
            </div>
            <div
              className="prose prose-sm prose-success dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentExplanationHtml) }}
            />
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <div>
            {currentHints.length > 0 && isCorrect !== true && !blockCompleted ? (
              <button
                type="button"
                onClick={handleToggleHint}
                className="flex items-center gap-2 rounded-full border-2 border-warning/30 bg-warning/5 px-5 py-2.5 text-[13px] font-semibold text-warning transition-all hover:bg-warning/10 active:scale-[0.97]"
              >
                <Lightbulb className="h-4 w-4" />
                {showHint ? "Ẩn gợi ý" : "Xem gợi ý"}
              </button>
            ) : (
              <div className="text-sm text-muted-foreground">
                {blockCompleted ? "Đã hoàn thành câu hỏi kèm media." : "Trả lời đúng để tiếp tục."}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {!resultMessage ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!answerHasValue(currentAnswer) || submitMutation.isPending || blockCompleted}
                className="rounded-full bg-primary px-8 py-3 text-[14px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận
              </button>
            ) : !isCorrect ? (
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-full bg-secondary text-secondary-foreground px-8 py-3 text-[14px] font-bold shadow-sm transition-all hover:bg-secondary/80 active:scale-[0.97] flex items-center gap-2"
              >
                Thử lại
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
