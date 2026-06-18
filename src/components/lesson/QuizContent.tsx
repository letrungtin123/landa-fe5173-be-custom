// ============================================================
// QuizContent — Hiển thị quiz từ XBlock + nộp câu trả lời
//
// Fetch rendered HTML từ /xblock/{usage_key} (qua Vite proxy
// với session cookie injection), parse bằng parseProblemHtml,
// render UI custom đẹp thay vì dùng iframe.
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import { Loader2, CheckCircle2, XCircle, ChevronDown, Info, Lightbulb } from "lucide-react";
import { getXBlockHtml, fetchExplanation } from "@/api/blocks";
import { useSubmitQuiz, parseQuizResult } from "@/hooks/useQuiz";
import { parseProblemHtml } from "@/transformers/problemParser";
import type { ParsedProblem } from "@/transformers/problemParser";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { markBlockComplete } from "@/api/progress";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlockSubmitStore } from "@/stores/useBlockSubmitStore";
import { LessonImageCarousel } from "./LessonImageCarousel";
import {
  hasProblemMedia,
  normalizeProblemMedia,
  resolveProblemMediaImageUrl,
  type ProblemMedia,
} from "@/lib/problemMedia";

// ── Custom Dropdown cho Problem Type: Dropdown ──
function CustomDropdown({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { id: string; text: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border-2 px-5 py-4 text-left transition-all ${disabled
          ? "cursor-not-allowed border-border bg-muted/50 opacity-70"
          : (isOpen || value)
            ? "border-primary bg-primary/5 ring-1 ring-primary text-foreground"
            : "border-border bg-background hover:bg-muted/20 text-foreground"
          }`}
      >
        <span
          className={`text-[15px] font-medium leading-relaxed ${value ? "text-primary" : "text-muted-foreground"
            }`}
        >
          {selectedOption ? selectedOption.text : "-- Kết quả chọn --"}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""
            } ${value && !isOpen ? "text-primary" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-background p-2 shadow-lg outline-none ring-1 ring-black/5 animate-in fade-in zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center rounded-lg px-4 py-3 text-left transition-colors ${value === opt.id
                ? "bg-primary/10 text-primary font-bold"
                : "text-foreground hover:bg-muted/80 hover:text-foreground font-medium"
                }`}
            >
              <span className="text-[14px]">{opt.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface QuizContentProps {
  /** Usage key của problem block cụ thể */
  problemUsageKey: string;
  problemMedia?: ProblemMedia | null;
  onImageClick?: (src: string) => void;
}

function ProblemMediaBlock({
  media,
  onImageClick,
}: {
  media?: ProblemMedia | null;
  onImageClick?: (src: string) => void;
}) {
  const normalized = normalizeProblemMedia(media);
  if (!hasProblemMedia(normalized)) return null;

  const images = normalized.images.map((img) => ({
    ...img,
    src: resolveProblemMediaImageUrl(img.src),
  }));

  return (
    <div className="mb-8 space-y-5">
      {normalized.youtube_id && (
        <div className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg">
          <iframe
            src={`https://www.youtube.com/embed/${normalized.youtube_id}?rel=0&modestbranding=1&showinfo=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title="Problem video"
          />
        </div>
      )}

      {images.length === 1 && (
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-muted/20 flex items-center justify-center border border-border shadow-sm p-4 cursor-zoom-in"
          onClick={() => onImageClick?.(images[0].src)}
        >
          <img
            src={images[0].src}
            alt={images[0].alt || "Problem image"}
            className="max-h-[450px] w-full object-contain"
          />
        </div>
      )}

      {images.length >= 2 && (
        <LessonImageCarousel
          images={images}
          onImageClick={(src) => onImageClick?.(src)}
        />
      )}
    </div>
  );
}

export function QuizContent({ problemUsageKey, problemMedia, onImageClick }: QuizContentProps) {
  const [parsedProblems, setParsedProblems] = useState<ParsedProblem[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const { courseId } = useParams();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Trạng thái giữ câu trả lời { input_1_2_1: "choice_0", ... }
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Nộp bài qua API
  const submit = useSubmitQuiz(problemUsageKey);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Hint state: dùng hints từ OLX parser, show on-demand khi click button
  const [showHint, setShowHint] = useState(false);

  // Explanation state: lưu giải thích đáp án fetch từ problem_show API
  const [fetchedExplanation, setFetchedExplanation] = useState<string>("");

  // Fetch quiz HTML qua useQuery — tự động dedup (Strict Mode safe) + cache
  const { data: quizHtml } = useQuery({
    queryKey: ["quiz-html", problemUsageKey],
    queryFn: () => getXBlockHtml(problemUsageKey),
    enabled: !!problemUsageKey,
    staleTime: 5 * 60 * 1000, // cache 5 phút
    gcTime: 10 * 60 * 1000,
  });

  // Parse quiz HTML khi data arrive
  useEffect(() => {
    if (!quizHtml) return;

    const problems = parseProblemHtml(quizHtml);

    // Tạo fingerprint từ nội dung quiz hiện tại
    const currentFingerprint = JSON.stringify(problems.map(p => p.type + '|' + (p.options?.map(o => o.text).join(',') || '')));

    // Kiểm tra cache với fingerprint
    const cached = useBlockSubmitStore.getState().getResult(problemUsageKey);
    if (cached && cached.parsedProblems && cached.parsedProblems.length > 0 && cached.contentFingerprint === currentFingerprint) {
      // Content không đổi → khôi phục từ cache
      setParsedProblems(cached.parsedProblems as ParsedProblem[]);
      setResultMessage(cached.resultMessage);
      setIsCorrect(cached.isCorrect);
      if (cached.answers) setAnswers(cached.answers);
      if (cached.explanationHtml) setFetchedExplanation(cached.explanationHtml);
    } else {
      // Content mới hoặc không có cache → hiển quiz mới
      if (cached) {
        useBlockSubmitStore.getState().setResult(problemUsageKey, undefined as any);
      }
      setParsedProblems(problems);
      setShowHint(false);
      setFetchedExplanation("");
      setAnswers({});
      setResultMessage(null);
      setIsCorrect(null);
    }
    setIsLoadingContent(false);
  }, [quizHtml, problemUsageKey]);

  // Handle onChange
  const handleChange = useCallback((id: string, value: string, type: string, checked?: boolean) => {
    if (resultMessage !== null) return;

    setAnswers((prev) => {
      if (type === "multi-select") {
        const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
        if (checked) {
          return { ...prev, [id]: [...current, value] };
        } else {
          return { ...prev, [id]: current.filter((v) => v !== value) };
        }
      }
      return { ...prev, [id]: value };
    });
  }, [resultMessage]);

  // Nộp bài
  const handleSubmit = useCallback(async () => {
    if (Object.keys(answers).length === 0 || !problemUsageKey) return;

    try {
      const response = await submit.mutateAsync(answers);
      const result = parseQuizResult(response);
      setResultMessage(result.message);
      setIsCorrect(result.correct);


      // Nếu server trả về HTML mới → re-parse quiz UI
      if (result.contents) {
        const updatedProblems = parseProblemHtml(result.contents);
        if (updatedProblems.length > 0) {
          setParsedProblems(updatedProblems);
        }
      }

      // CHỈ fetch giải thích đáp án khi trả lời ĐÚNG
      let explanationHtml = "";
      if (result.correct) {
        try {
          const explanationResult = await fetchExplanation(problemUsageKey);
          if (explanationResult.explanationHtml) {
            explanationHtml = explanationResult.explanationHtml;
            setFetchedExplanation(explanationHtml);
          }
        } catch (e) {
          // Explanation không khả dụng (quiz setting)
        }
      }

      // Lưu kết quả vào session store (kèm fingerprint để phát hiện content thay đổi)
      const fp = JSON.stringify(parsedProblems.map(p => p.type + '|' + (p.options?.map(o => o.text).join(',') || '')));
      useBlockSubmitStore.getState().setResult(problemUsageKey, {
        resultMessage: result.message,
        isCorrect: result.correct,
        answers: { ...answers },
        explanationHtml: explanationHtml || undefined,
        parsedProblems: [...parsedProblems],
        contentFingerprint: fp,
      });

      // CHỈ khi trả lời ĐÚNG mới gọi markBlockComplete và cập nhật tiến độ sidebar
      if (result.correct && courseId && user?.username) {
        try {
          await markBlockComplete(courseId, problemUsageKey);
        } catch (e) {
          console.error("Failed to mark block complete:", e);
        }

        // Refetch progress với retry để bắt kịp backend aggregation
        refetchProgressWithRetry(qc, courseId);
      }
      // Nếu trả lời SAI → KHÔNG gọi API completion, KHÔNG invalidate queries → sidebar giữ nguyên

    } catch {
      setResultMessage("Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.");
      setIsCorrect(false);
    }
  }, [answers, problemUsageKey, submit, courseId, user?.username]);

  // Toggle hint visibility — dùng hints từ OLX parser (prob.hintHtml)
  const handleToggleHint = useCallback(() => {
    setShowHint(prev => !prev);
  }, []);

  // Check xem có hint không (từ OLX parsed data)
  const hasHints = parsedProblems.some(p => p.hasHints && p.hintHtml);

  // ── Loading state ──
  if (isLoadingContent) {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="space-y-4">
            <div className="h-6 w-3/4 rounded-md bg-muted animate-pulse mb-8" />
            <div className="h-16 w-full rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-16 w-full rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-16 w-full rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-16 w-full rounded-2xl bg-muted/60 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (parsedProblems.length === 0) {
    return (
      <div className="w-full py-12 text-center">
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

  // ── Render quiz ──
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <ProblemMediaBlock media={problemMedia} onImageClick={onImageClick} />
        {parsedProblems.map((prob) => (
          <div key={prob.id} className="mb-10 last:mb-0">

            {/* Câu hỏi HTML */}
            <div
              className="mb-8 text-[20px] md:text-[24px] font-bold leading-snug text-foreground"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(prob.questionHtml),
              }}
            />

            {/* Giải thích loại đáp án cần chọn */}
            <div className="mb-4 flex items-center gap-2 text-[14px] font-medium text-muted-foreground bg-muted/30 w-fit px-3 py-1.5 rounded-md border border-border/50">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span>
                {prob.type === "single-select" && "Chỉ chọn 1 đáp án."}
                {prob.type === "multi-select" && "Được phép chọn nhiều đáp án."}
                {prob.type === "dropdown" && "Chọn đáp án từ danh sách xổ xuống."}
                {prob.type === "text-input" && "Nhập đáp án vào ô trống."}
              </span>
            </div>

            {/* Lựa chọn */}
            <div className="space-y-4">
              {/* Single Select (radio) */}
              {prob.type === "single-select" &&
                prob.options?.map((opt, index) => {
                  const isSelected = answers[prob.id] === opt.id;
                  const isDisabled = resultMessage !== null;
                  const labelLetter = String.fromCharCode(65 + index); // A, B, C, D...

                  return (
                    <label
                      key={opt.id}
                      className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl p-4 text-left transition-all ${isSelected
                        ? "bg-primary/5 ring-1 ring-primary"
                        : "bg-muted/40 hover:bg-muted/80"
                        } ${isDisabled ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <input
                        type="radio"
                        name={prob.id}
                        value={opt.id}
                        checked={isSelected}
                        onChange={(e) => handleChange(prob.id, e.target.value, prob.type)}
                        disabled={isDisabled}
                        className="hidden"
                      />

                      {/* A, B, C, D Box */}
                      <div
                        className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-[16px] font-bold transition-colors ${isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground shadow-sm"
                          }`}
                      >
                        {labelLetter}
                      </div>

                      <span className="flex-1 text-[15px] font-medium leading-relaxed text-foreground">
                        {opt.text}
                      </span>

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="shrink-0 pl-2">
                          <CheckCircle2 className="h-6 w-6 text-primary fill-primary text-primary-foreground" />
                        </div>
                      )}
                    </label>
                  );
                })}

              {/* Multi Select (checkbox) */}
              {prob.type === "multi-select" &&
                prob.options?.map((opt, index) => {
                  const currentAns = Array.isArray(answers[prob.id]) ? (answers[prob.id] as string[]) : [];
                  const isSelected = currentAns.includes(opt.id);
                  const isDisabled = resultMessage !== null;
                  const labelLetter = String.fromCharCode(65 + index); // A, B, C, D...

                  return (
                    <label
                      key={opt.id}
                      className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl p-4 text-left transition-all ${isSelected
                        ? "bg-primary/5 ring-1 ring-primary"
                        : "bg-muted/40 hover:bg-muted/80"
                        } ${isDisabled ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name={prob.id}
                        value={opt.id}
                        checked={isSelected}
                        onChange={(e) => handleChange(prob.id, e.target.value, prob.type, e.target.checked)}
                        disabled={isDisabled}
                        className="hidden"
                      />

                      {/* A, B, C, D Box */}
                      <div
                        className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-[16px] font-bold transition-colors ${isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground shadow-sm"
                          }`}
                      >
                        {labelLetter}
                      </div>

                      <span className="flex-1 text-[15px] font-medium leading-relaxed text-foreground">
                        {opt.text}
                      </span>

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="shrink-0 pl-2">
                          <CheckCircle2 className="h-6 w-6 text-primary fill-primary text-primary-foreground" />
                        </div>
                      )}
                    </label>
                  );
                })}

              {/* Dropdown */}
              {prob.type === "dropdown" && (
                <CustomDropdown
                  options={prob.options || []}
                  value={(answers[prob.id] as string) || ""}
                  onChange={(newVal) => handleChange(prob.id, newVal, prob.type)}
                  disabled={resultMessage !== null}
                />
              )}

              {/* Text / Numerical Input */}
              {prob.type === "text-input" && (
                <input
                  type="text"
                  placeholder="Nhập câu trả lời..."
                  value={(answers[prob.id] as string) || ""}
                  onChange={(e) => handleChange(prob.id, e.target.value, prob.type)}
                  disabled={resultMessage !== null}
                  className="w-full rounded-lg border-2 border-border bg-background text-foreground dark:bg-slate-900 p-4 text-sm focus:border-primary focus:ring-primary disabled:opacity-50 disabled:bg-muted dark:disabled:bg-slate-800"
                />
              )}
            </div>

            {/* Giải thích đáp án — CHỈ hiện khi trả lời ĐÚNG */}
            {isCorrect === true && resultMessage && ((fetchedExplanation || prob.explanationHtml) || prob.correctAnswerHtml || prob.type === 'text-input') && (
              <div className="mt-8">
                <div className="rounded-xl bg-success/10 border border-success/20 p-5">
                  <div className="flex items-center gap-2 mb-3 text-success">
                    <Info className="h-5 w-5" />
                    <span className="font-bold text-sm tracking-wide uppercase">Đáp án & Giải thích</span>
                  </div>

                  {/* Đáp án đúng */}
                  {(prob.correctAnswerHtml || answers[prob.id]) && (
                    <div className="mb-4 pb-4 border-b border-success/20">
                      <span className="text-[14px] font-semibold text-success/90 uppercase tracking-wider block mb-1">
                        Đáp án đúng:
                      </span>
                      <div
                        className="text-[15px] font-bold text-foreground"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((prob.correctAnswerHtml || answers[prob.id]) as string) }}
                      />
                    </div>
                  )}

                  {/* Giải thích chi tiết */}
                  {(fetchedExplanation || prob.explanationHtml) && (
                    <div
                      className="prose prose-sm prose-success dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fetchedExplanation || prob.explanationHtml || "") }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Gợi ý — CHỈ hiện khi click button "Xem gợi ý" */}
            {showHint && prob.hintHtml && (
              <div className="mt-4">
                <div className="rounded-xl bg-warning/10 border border-warning/20 p-5">
                  <div className="flex items-center gap-2 mb-3 text-warning">
                    <Lightbulb className="h-5 w-5" />
                    <span className="font-bold text-sm tracking-wide uppercase">Gợi ý</span>
                  </div>
                  <div
                    className="prose prose-sm prose-warning dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prob.hintHtml) }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Kết quả sau khi nộp */}
        {resultMessage && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-xl p-4 ${isCorrect
              ? "bg-success/10 border border-success/20"
              : "bg-destructive/10 border border-destructive/20"
              }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
            )}
            <p className="text-sm font-medium text-foreground">
              {DOMPurify.sanitize(resultMessage).replace(/(<([^>]+)>)/gi, "")}
            </p>
          </div>
        )}

        {/* Nút nộp bài / Thử lại + Xem gợi ý */}
        <div className="mt-8 flex items-center justify-between">
          {/* Nút xem gợi ý (bên trái) — chỉ hiện khi chưa trả lời đúng và có hint */}
          <div>
            {hasHints && isCorrect !== true && (
              <button
                onClick={handleToggleHint}
                className="flex items-center gap-2 rounded-full border-2 border-warning/30 bg-warning/5 px-5 py-2.5 text-[13px] font-semibold text-warning transition-all hover:bg-warning/10 active:scale-[0.97]"
              >
                <Lightbulb className="h-4 w-4" />
                {showHint ? "Ẩn gợi ý" : "Xem gợi ý"}
              </button>
            )}
          </div>

          {/* Nút xác nhận / thử lại (bên phải) */}
          <div className="flex gap-3">
            {!resultMessage ? (
              <button
                disabled={Object.keys(answers).length === 0 || submit.isPending}
                onClick={handleSubmit}
                className="rounded-full bg-primary px-8 py-3 text-[14px] font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              >
                {submit.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Xác nhận
              </button>
            ) : !isCorrect ? (
              <button
                onClick={() => {
                  setAnswers({});
                  setResultMessage(null);
                  setIsCorrect(null);
                  setShowHint(false);
                }}
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
