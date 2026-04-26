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
import { getXBlockHtml, fetchHint, fetchExplanation } from "@/api/blocks";
import { useSubmitQuiz, parseQuizResult } from "@/hooks/useQuiz";
import { parseProblemHtml } from "@/transformers/problemParser";
import type { ParsedProblem } from "@/transformers/problemParser";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { markBlockComplete } from "@/api/progress";
import { useQueryClient } from "@tanstack/react-query";

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
            : isOpen || value
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border bg-muted/20 hover:bg-muted/60"
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
}

export function QuizContent({ problemUsageKey }: QuizContentProps) {
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

  // Hint state: lưu danh sách hints đã fetch
  const [fetchedHints, setFetchedHints] = useState<string[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  // Bắt đầu = false, chỉ set true khi parser xác nhận quiz CÓ hint
  const [hasMoreHints, setHasMoreHints] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  // Explanation state: lưu giải thích đáp án fetch từ problem_show API
  const [fetchedExplanation, setFetchedExplanation] = useState<string>("");

  // Tải rendered HTML từ XBlock (qua Vite proxy) và parse
  useEffect(() => {
    if (!problemUsageKey) return;

    let cancelled = false;

    console.log('[QuizContent] Fetching problem:', problemUsageKey);
    getXBlockHtml(problemUsageKey)
      .then((html) => {
        if (cancelled) return;
        console.log('[QuizContent] XBlock HTML length:', html.length);
        console.log('[QuizContent] XBlock HTML preview:', html.substring(0, 500));
        const problems = parseProblemHtml(html);
        console.log('[QuizContent] Parsed problems:', problems.length, problems);
        setParsedProblems(problems);
        // Chỉ bật nút "Xem gợi ý" nếu BẤT KỲ problem nào có hint
        const anyHasHints = problems.some(p => p.hasHints);
        setHasMoreHints(anyHasHints);
        setFetchedHints([]);
        setHintIndex(0);
        setFetchedExplanation("");
        setAnswers({});
        setResultMessage(null);
        setIsCorrect(null);
        setIsLoadingContent(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load quiz XBlock:", err);
        setParsedProblems([]);
        setIsLoadingContent(false);
      });

    return () => { cancelled = true; };
  }, [problemUsageKey]);

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
      if (result.correct) {
        try {
          const explanationResult = await fetchExplanation(problemUsageKey);
          if (explanationResult.explanationHtml) {
            setFetchedExplanation(explanationResult.explanationHtml);
          }
        } catch (e) {
          console.log('[QuizContent] Explanation not available (likely quiz setting):', e);
        }
      }

      // CHỈ khi trả lời ĐÚNG mới gọi markBlockComplete và cập nhật tiến độ sidebar
      if (result.correct && courseId && user?.username) {
        try {
          await markBlockComplete(user.username, courseId, problemUsageKey);
        } catch (e) {
          console.error("Failed to mark block complete:", e);
        }

        // Đợi một chút để LMS xử lý điểm số và cập nhật tiến độ vào database (qua Celery task)
        // Sau đó mới fetch lại course-completion và course-blocks
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["course-completion"] });
          qc.invalidateQueries({ queryKey: ["course-blocks"] });
        }, 1000);
      }
      // Nếu trả lời SAI → KHÔNG gọi API completion, KHÔNG invalidate queries → sidebar giữ nguyên

    } catch {
      setResultMessage("Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.");
      setIsCorrect(false);
    }
  }, [answers, problemUsageKey, submit, courseId, user?.username]);

  // Fetch hint từ Open edX on demand
  const handleFetchHint = useCallback(async () => {
    if (!problemUsageKey || isLoadingHint || !hasMoreHints) return;
    setIsLoadingHint(true);
    try {
      const result = await fetchHint(problemUsageKey, hintIndex);
      // edX get_demand_hint returns ALL hints cumulatively (hint 0 to hintIndex in one <ol>)
      // So we REPLACE the stored hint HTML (not append) to avoid duplication
      if (result.hint) {
        setFetchedHints([result.hint]);
        setHintIndex(prev => prev + 1);
        setHasMoreHints(result.hasMoreHints);
      } else {
        setHasMoreHints(false);
      }
    } catch (e) {
      console.error('[QuizContent] Failed to fetch hint:', e);
    } finally {
      setIsLoadingHint(false);
    }
  }, [problemUsageKey, hintIndex, isLoadingHint, hasMoreHints]);

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
        {parsedProblems.map((prob) => (
          <div key={prob.id} className="mb-10 last:mb-0">

            {/* Câu hỏi HTML */}
            <div
              className="mb-8 text-[20px] md:text-[24px] font-bold leading-snug text-foreground"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(prob.questionHtml),
              }}
            />

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
                  className="w-full rounded-lg border-2 border-border p-4 text-sm focus:border-primary focus:ring-primary disabled:opacity-50 disabled:bg-muted"
                />
              )}
            </div>

            {/* Giải thích đáp án (hiện sau khi nộp bài) */}
            {/* Ưu tiên: fetchedExplanation (từ problem_show API) > prob.explanationHtml (từ parser) */}
            {(fetchedExplanation || prob.explanationHtml) && resultMessage && (
              <div className="mt-8">
                <div className="rounded-xl bg-success/10 border border-success/20 p-5">
                  <div className="flex items-center gap-2 mb-3 text-success">
                    <Info className="h-5 w-5" />
                    <span className="font-bold text-sm tracking-wide uppercase">Giải thích đáp án</span>
                  </div>
                  <div
                    className="prose prose-sm prose-success dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fetchedExplanation || prob.explanationHtml || "") }}
                  />
                </div>
              </div>
            )}

            {/* Gợi ý — fetch on demand từ edX hint_button API */}
            {fetchedHints.length > 0 && (
              <div className="mt-4">
                <div className="rounded-xl bg-warning/10 border border-warning/20 p-5">
                  <div className="flex items-center gap-2 mb-3 text-warning">
                    <Lightbulb className="h-5 w-5" />
                    <span className="font-bold text-sm tracking-wide uppercase">Gợi ý</span>
                  </div>
                  <div className="space-y-2">
                    {fetchedHints.map((hint, idx) => (
                      <div
                        key={idx}
                        className="prose prose-sm prose-warning dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hint) }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nút lấy hint từ parser (nếu có sẵn trong HTML) */}
            {prob.hintHtml && (
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
          {/* Nút xem gợi ý (bên trái) */}
          <div>
            {hasMoreHints && !isCorrect && (
              <button
                onClick={handleFetchHint}
                disabled={isLoadingHint}
                className="flex items-center gap-2 rounded-full border-2 border-warning/30 bg-warning/5 px-5 py-2.5 text-[13px] font-semibold text-warning transition-all hover:bg-warning/10 active:scale-[0.97] disabled:opacity-50"
              >
                {isLoadingHint ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                {fetchedHints.length > 0 ? "Gợi ý tiếp" : "Xem gợi ý"}
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
