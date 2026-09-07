import DOMPurify from "dompurify";
import { Check, CheckCircle2, Image as ImageIcon, Info, Lightbulb, Loader2, X, XCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { submitImageChoiceQuizAnswer } from "@/api/blocks";
import { markBlockComplete } from "@/api/progress";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBlockSubmitStore } from "@/stores/useBlockSubmitStore";
import {
  normalizeImageChoiceQuizData,
  resolveImageChoiceQuizImageUrl,
  type ImageChoiceQuizChoice,
  type ImageChoiceQuizData,
} from "@/lib/imageChoiceQuiz";
import { useTranslation } from "react-i18next";

interface ImageChoiceQuizContentProps {
  usageKey: string;
  imageChoiceQuizData: ImageChoiceQuizData;
}

function buildFingerprint(quiz: ImageChoiceQuizData): string {
  return JSON.stringify({
    prompt_html: quiz.prompt_html,
    hints: quiz.hints,
    choices: quiz.choices.map(choice => ({
      id: choice.id,
      html: choice.html,
      image_path: choice.image.storage_path,
    })),
  });
}

function ChoiceImage({
  choice,
  onPreview,
}: {
  choice: ImageChoiceQuizChoice;
  onPreview: (image: { src: string; alt: string }) => void;
}) {
  const { t } = useTranslation();
  if (!choice.image.storage_path) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center text-sm font-semibold text-muted-foreground">
        {t("quiz.imageUnavailable")}
      </div>
    );
  }

  const imageUrl = resolveImageChoiceQuizImageUrl(choice.image.storage_path);
  const imageAlt = choice.image.alt || t("quiz.answerImage");
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onPreview({ src: imageUrl, alt: imageAlt });
      }}
      className="flex h-full min-h-0 w-full cursor-zoom-in items-center justify-center rounded-xl border border-border bg-background p-2 text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
      aria-label={t("quiz.zoomAnswerImage")}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        className="h-full max-h-full w-full max-w-full rounded-lg object-contain"
      />
    </button>
  );
}

export function ImageChoiceQuizContent({ usageKey, imageChoiceQuizData }: ImageChoiceQuizContentProps) {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const quiz = useMemo(() => normalizeImageChoiceQuizData(imageChoiceQuizData), [imageChoiceQuizData]);
  const contentFingerprint = useMemo(() => buildFingerprint(quiz), [quiz]);
  const [selectedId, setSelectedId] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [blockCompleted, setBlockCompleted] = useState(false);
  const [explanationHtml, setExplanationHtml] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

  const saveSubmitState = (state: {
    selectedId: string;
    resultMessage: string;
    isCorrect: boolean;
    blockCompleted: boolean;
    explanationHtml?: string;
  }) => {
    useBlockSubmitStore.getState().setResult(usageKey, {
      resultMessage: state.resultMessage,
      isCorrect: state.isCorrect,
      answers: { answer: state.selectedId },
      explanationHtml: state.explanationHtml || undefined,
      contentFingerprint,
      blockCompleted: state.blockCompleted,
    });
  };

  useEffect(() => {
    const cached = useBlockSubmitStore.getState().getResult(usageKey);
    if (cached && cached.contentFingerprint === contentFingerprint) {
      const cachedAnswer = typeof cached.answers?.answer === "string" ? cached.answers.answer : "";
      setSelectedId(cachedAnswer);
      setResultMessage(cached.resultMessage || null);
      setIsCorrect(cached.resultMessage && typeof cached.isCorrect === "boolean" ? cached.isCorrect : null);
      setBlockCompleted(cached.blockCompleted === true);
      setExplanationHtml(cached.explanationHtml || "");
      setShowHint(false);
      setPreviewImage(null);
    } else {
      if (cached) {
        useBlockSubmitStore.getState().setResult(usageKey, undefined as any);
      }
      setSelectedId("");
      setResultMessage(null);
      setIsCorrect(null);
      setBlockCompleted(false);
      setExplanationHtml("");
      setShowHint(false);
      setPreviewImage(null);
    }
  }, [usageKey, contentFingerprint]);

  const hints = quiz.hints?.filter(hint => hint.trim().length > 0) ?? [];

  const submitMutation = useMutation({
    mutationFn: (choiceId: string) => submitImageChoiceQuizAnswer(usageKey, choiceId),
    onSuccess: async (data, choiceId) => {
      const correct = data.status === "correct";
      const nextBlockCompleted = correct && data.completed === true;
      const nextExplanationHtml = correct && typeof data.explanation_html === "string" ? data.explanation_html : "";
      const nextResultMessage = correct
        ? t("quiz.correctComplete")
        : t("quiz.incorrect");

      setResultMessage(nextResultMessage);
      setIsCorrect(correct);
      setBlockCompleted(nextBlockCompleted);
      setExplanationHtml(nextExplanationHtml);
      setShowHint(false);
      saveSubmitState({
        selectedId: choiceId,
        resultMessage: nextResultMessage,
        isCorrect: correct,
        blockCompleted: nextBlockCompleted,
        explanationHtml: nextExplanationHtml,
      });

      if (!correct) return;

      if (courseId && user?.username) {
        try {
          await markBlockComplete(courseId, usageKey);
          refetchProgressWithRetry(qc, courseId);
        } catch (error) {
          console.error("Failed to mark image choice quiz complete:", error);
        }
      }
    },
    onError: () => {
      const nextResultMessage = t("quiz.submitUnavailable");
      setResultMessage(nextResultMessage);
      setIsCorrect(false);
      setShowHint(false);
      saveSubmitState({
        selectedId,
        resultMessage: nextResultMessage,
        isCorrect: false,
        blockCompleted,
      });
    },
  });

  if (quiz.choices.length < 2 || !quiz.prompt_html.trim()) {
    return (
      <div className="w-full py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-foreground">{t("quiz.imageQuizUnavailable")}</h2>
        <p className="text-sm text-muted-foreground">{t("quiz.incompleteComponent")}</p>
      </div>
    );
  }

  const locked = submitMutation.isPending || blockCompleted || !!resultMessage;

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div
          className="mb-6 whitespace-pre-wrap break-words text-[20px] font-bold leading-snug text-foreground md:text-[24px] [&_br]:block [&_p]:my-0"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(quiz.prompt_html) }}
        />

        <div className="mb-5 flex items-center gap-2 text-[14px] font-medium text-muted-foreground bg-muted/30 w-fit px-3 py-1.5 rounded-md border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span>{t("quiz.chooseCorrect")}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quiz.choices.map((choice, index) => {
            const selected = selectedId === choice.id;
            const wrongSelection = resultMessage && selected && isCorrect === false;
            const correctSelection = resultMessage && selected && isCorrect === true;
            const labelLetter = String.fromCharCode(65 + index);

            return (
              <div
                role="button"
                tabIndex={locked ? -1 : 0}
                key={choice.id}
                onClick={() => {
                  if (locked) return;
                  setSelectedId(choice.id);
                  setResultMessage(null);
                  setIsCorrect(null);
                  setExplanationHtml("");
                  setShowHint(false);
                }}
                onKeyDown={(event) => {
                  if (locked) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setSelectedId(choice.id);
                  setResultMessage(null);
                  setIsCorrect(null);
                  setExplanationHtml("");
                  setShowHint(false);
                }}
                aria-disabled={locked}
                className={`group flex aspect-square min-w-0 flex-col overflow-hidden rounded-2xl border p-3 text-left transition-all ${
                  wrongSelection
                    ? "border-destructive bg-destructive/5"
                    : correctSelection
                      ? "border-success bg-success/5"
                      : selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/70"
                } ${locked ? "cursor-default opacity-95" : "cursor-pointer"}`}
              >
                <div className="mb-3 flex min-h-0 items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold transition-colors ${
                      wrongSelection
                        ? "bg-destructive text-destructive-foreground"
                        : correctSelection
                          ? "bg-success text-white"
                          : selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground shadow-sm"
                    }`}
                  >
                    {labelLetter}
                  </div>
                  <div
                    className="line-clamp-2 min-w-0 flex-1 overflow-hidden text-[15px] font-semibold leading-snug text-foreground [&_p]:m-0"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(choice.html) }}
                  />
                  {selected && (
                    wrongSelection
                      ? <XCircle className="h-6 w-6 shrink-0 text-destructive" />
                      : <CheckCircle2 className={`h-6 w-6 shrink-0 ${correctSelection ? "text-success" : "text-primary"}`} />
                  )}
                </div>
                <div className="min-h-0 flex-1">
                  <ChoiceImage choice={choice} onPreview={setPreviewImage} />
                </div>
              </div>
            );
          })}
        </div>

        {showHint && hints.length > 0 && (
          <div className="mt-5 rounded-xl border border-warning/20 bg-warning/10 p-5">
            <div className="mb-3 flex items-center gap-2 text-warning">
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wide">{t("quiz.hint")}</span>
            </div>
            <div className="space-y-3">
              {hints.map((hint, index) => (
                <div key={`image-choice-hint-${index}`} className="prose prose-sm prose-warning dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90">
                  <div className="font-semibold">{t("quiz.hintNumber", { index: index + 1 })}</div>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hint) }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {resultMessage && isCorrect === false && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <XCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-foreground">{resultMessage}</p>
          </div>
        )}

        {resultMessage && isCorrect === true && explanationHtml && (
          <div className="mt-5 rounded-xl border border-success/20 bg-success/10 p-5">
            <div className="mb-3 flex items-center gap-2 text-success">
              <Info className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wide">{t("quiz.explanation")}</span>
            </div>
            <div
              className="prose prose-sm prose-success dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(explanationHtml) }}
            />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {hints.length > 0 && isCorrect !== true && !blockCompleted ? (
              <button
                type="button"
                onClick={() => setShowHint(prev => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-transparent px-0 py-3 text-[14px] font-bold text-warning transition-all hover:text-warning/80 active:scale-[0.97]"
              >
                <Lightbulb className="h-4 w-4" />
                {showHint ? t("quiz.hideHint") : t("quiz.showHint")}
              </button>
            ) : null}
          </div>

          <div className="flex justify-end">
            {!resultMessage ? (
              <button
                type="button"
                onClick={() => {
                  setShowHint(false);
                  if (selectedId) submitMutation.mutate(selectedId);
                }}
                disabled={!selectedId || submitMutation.isPending || blockCompleted}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-[14px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("quiz.confirm")}
              </button>
            ) : isCorrect === false ? (
              <button
                type="button"
                onClick={() => {
                  useBlockSubmitStore.getState().setResult(usageKey, undefined as any);
                  setSelectedId("");
                  setResultMessage(null);
                  setIsCorrect(null);
                  setExplanationHtml("");
                  setShowHint(false);
                }}
                className="inline-flex items-center justify-center rounded-full bg-secondary px-8 py-3 text-[14px] font-bold text-secondary-foreground shadow-sm transition-all hover:bg-secondary/80 active:scale-[0.97]"
              >
                {t("quiz.retry")}
              </button>
            ) : (
              <div className="flex items-center justify-end gap-1.5 px-4 py-3 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5 shrink-0 stroke-[3]" />
                <span className="text-[14px] font-bold whitespace-nowrap">{t("quiz.completed")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("quiz.viewAnswerImage")}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-5xl rounded-2xl bg-background p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
              aria-label={t("quiz.closeImagePreview")}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              className="max-h-[86vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
