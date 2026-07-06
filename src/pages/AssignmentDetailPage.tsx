import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  FileUp,
  Loader2,
  Lock,
  MessageSquareText,
  Paperclip,
  RefreshCcw,
  Send,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { downloadAssignmentFile, type AssignmentFileMeta } from "@/api/assignments";
import { useAssignment, useSubmitAssignment } from "@/hooks/useAssignments";

const MAX_PENDING_FILES = 5;

function statusLabel(status?: string) {
  if (status === "feedback_given") return "Đã phản hồi";
  if (status === "submitted") return "Đã nộp";
  return "Chưa nộp";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value?: number) {
  if (!value) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

function mergeFiles(current: File[], incoming: File[]) {
  const next = new Map(current.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
  for (const file of incoming) {
    next.set(`${file.name}-${file.size}-${file.lastModified}`, file);
  }
  return Array.from(next.values()).slice(0, MAX_PENDING_FILES);
}

function FileList({
  files,
  tone = "default",
  layout = "grid",
}: {
  files: AssignmentFileMeta[];
  tone?: "default" | "success";
  layout?: "grid" | "single";
}) {
  if (!files.length) return null;

  return (
    <div className={cn("grid gap-2", layout === "grid" && "sm:grid-cols-2")}>
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={() => downloadAssignmentFile(file)}
          className={cn(
            "group flex w-full min-w-0 items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
            tone === "success" ? "border-success/25 hover:border-success/50" : "border-border hover:border-primary/40",
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              tone === "success" ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
            )}
          >
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-foreground">{file.original_name}</span>
            <span className="block text-[11px] font-medium text-muted-foreground">{formatBytes(file.size_bytes)}</span>
          </span>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
        </button>
      ))}
    </div>
  );
}

function AssignmentTimeline({ status }: { status?: string }) {
  const step = status === "feedback_given" ? 2 : status === "submitted" ? 1 : 0;
  const items = [
    {
      label: "Chưa nộp",
      shortLabel: "Chưa nộp",
      dotClass: "border-destructive bg-destructive",
      textClass: "text-destructive",
      ringClass: "ring-destructive/15",
    },
    {
      label: "Đã nộp",
      shortLabel: "Đã nộp",
      dotClass: "border-amber-500 bg-amber-500",
      textClass: "text-amber-600 dark:text-amber-300",
      ringClass: "ring-amber-500/15",
    },
    {
      label: "Phản hồi",
      shortLabel: "Phản hồi",
      dotClass: "border-success bg-success",
      textClass: "text-success",
      ringClass: "ring-success/15",
    },
  ];

  return (
    <div className="px-1 pb-1 pt-2">
      <div className="relative mx-auto max-w-[280px]">
        <div className="absolute left-[16.666%] right-[16.666%] top-[9px] h-[2px] rounded-full bg-primary/25" />
        <div
          className="absolute left-[16.666%] top-[9px] h-[2px] rounded-full bg-primary transition-all duration-500"
          style={{ width: step === 0 ? "0%" : step === 1 ? "33.333%" : "66.666%" }}
        />
        <div className="relative grid grid-cols-3 gap-2">
          {items.map((item, index) => {
            const active = index <= step;
            const current = index === step;
            return (
              <div
                key={item.label}
                className="flex min-w-0 flex-col items-center text-center"
              >
                <span className="relative z-10 flex h-5 items-center justify-center">
                  {current ? (
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border shadow-sm ring-[3px]",
                        item.dotClass,
                        item.ringClass,
                      )}
                    />
                  ) : (
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full border transition-all duration-300",
                        active ? "border-primary/70 bg-primary/70" : "border-primary/30 bg-background",
                      )}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-2 block max-w-full truncate text-[10px] font-bold uppercase tracking-wide",
                    current ? item.textClass : active ? "text-primary/80" : "text-muted-foreground",
                  )}
                >
                  {item.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AssignmentDetailPage() {
  const { courseId, assignmentId } = useParams();
  const { data: assignment, isLoading, isError } = useAssignment(assignmentId);
  const submitMut = useSubmitAssignment(courseId, assignmentId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setAnswer(assignment?.submission?.answer_text || "");
    setFiles([]);
    setMessage(null);
  }, [assignment?.id, assignment?.submission?.answer_text]);

  const submission = assignment?.submission;
  const isFeedbackGiven = assignment?.status === "feedback_given";
  const isSubmitted = assignment?.status === "submitted";
  const progressStep = isFeedbackGiven ? 3 : isSubmitted ? 2 : 1;
  const isDeadlineExpired = Boolean(assignment?.is_deadline_expired);
  const canResubmit = Boolean(isSubmitted && assignment?.allow_resubmission && !isDeadlineExpired);
  const canSubmit = Boolean(assignment?.can_submit && !isFeedbackGiven && (!isSubmitted || canResubmit));
  const isLocked = Boolean(assignment && assignment.locked_reason === "progress");
  const selectedFileSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const answerCount = answer.trim().length;
  const feedbackReviewer = submission?.feedback_by_name || submission?.feedback_by_username || submission?.feedback_by_email || "";

  const submitHint = useMemo(() => {
    if (isDeadlineExpired && !isFeedbackGiven) return "Đã hết thời hạn nộp bài";
    if (isLocked) return "Khóa đến khi hoàn thành 100% khóa học";
    if (isFeedbackGiven) return "Bài tập đã có phản hồi";
    if (isSubmitted && !canResubmit) return "Bài đã nộp và đang chờ phản hồi";
    if (canResubmit) return "Có thể nộp lại trước khi quản trị viên phản hồi";
    return "Sẵn sàng nộp bài";
  }, [canResubmit, isDeadlineExpired, isFeedbackGiven, isLocked, isSubmitted]);

  function addPendingFiles(incoming: File[]) {
    if (!canSubmit || incoming.length === 0) return;
    setFiles((current) => mergeFiles(current, incoming));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addPendingFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addPendingFiles(Array.from(event.dataTransfer.files || []));
  }

  function removePendingFile(target: File) {
    setFiles((current) => current.filter((file) => file !== target));
  }

  function submit() {
    if (!canSubmit || !answer.trim()) return;
    setMessage(null);
    submitMut.mutate(
      { answer_text: answer.trim(), files },
      {
        onSuccess: () => {
          setFiles([]);
          setMessage({ type: "success", text: canResubmit ? "Đã nộp lại bài tập" : "Đã nộp bài tập" });
        },
        onError: (err: any) => {
          setMessage({ type: "error", text: err?.response?.data?.message || "Nộp bài thất bại" });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Skeleton className="mb-4 h-10 w-44 rounded-xl" />
        <Skeleton className="mb-4 h-32 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[360px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !assignment) {
    return (
      <div className="mx-auto flex min-h-[420px] w-full max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <ClipboardList className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-[22px] font-bold text-foreground">Không tìm thấy bài tập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bài tập này chưa sẵn sàng hoặc bạn không có quyền truy cập.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {isDeadlineExpired && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-destructive">Đã hết thời hạn nộp bài</div>
              <div className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                Bạn vẫn có thể xem yêu cầu và phản hồi, nhưng không thể nộp hoặc nộp lại bài tập này.
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="absolute inset-x-0 top-0 h-1 accent-surface-gradient" />
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 items-center gap-2 rounded-full bg-primary/10 px-3 text-[11px] font-bold uppercase tracking-widest text-primary">
                <ClipboardList className="h-3.5 w-3.5" />
                Bài tập
              </span>
              {assignment.deadline_enabled && assignment.deadline_at && (
                <span
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 text-[12px] font-bold",
                    isDeadlineExpired
                      ? "text-destructive"
                      : "text-amber-700 dark:text-amber-300",
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Hạn {formatDate(assignment.deadline_at)}
                </span>
              )}
            </div>
            <div className="max-w-3xl">
              <h1 className="text-[28px] font-semibold leading-[34px] text-foreground sm:text-[36px] sm:leading-[42px] lg:text-[42px] lg:leading-[48px]">
                {assignment.title}
              </h1>
              <p className="mt-3 text-[14px] font-medium leading-6 text-muted-foreground sm:text-[15px]">
                {submitHint}
              </p>
            </div>
          </section>

          <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tiến trình</div>
                <div className="mt-1 text-[18px] font-bold leading-6 text-foreground">{statusLabel(assignment.status)}</div>
              </div>
              <span
                className={cn(
                  "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-bold",
                  isFeedbackGiven
                    ? "border-success/25 bg-success/10 text-success"
                    : isSubmitted
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {progressStep}/3
              </span>
            </div>
            <AssignmentTimeline status={assignment.status} />
          </aside>
        </div>

        {isLocked && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-warning dark:bg-warning/10">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">Hoàn thành 100% khóa học để mở nộp bài</div>
              <div className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                Bạn vẫn xem được yêu cầu bài tập, nhưng form nộp bài sẽ khóa đến khi đủ tiến độ.
              </div>
            </div>
          </div>
        )}

        {message && (
          <div
            role="alert"
            className={cn(
              "mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold",
              message.type === "success"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[18px] font-bold leading-6 text-foreground">Câu hỏi</h2>
                  <p className="text-[13px] font-medium text-muted-foreground">Yêu cầu bài tập của khóa học</p>
                </div>
              </div>
              <div className="whitespace-pre-wrap rounded-xl border border-border bg-muted/25 px-4 py-4 text-[15px] leading-7 text-foreground">
                {assignment.question}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-bold leading-6 text-foreground">Bài làm</h2>
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                    {submission?.submitted_at
                      ? `Lần nộp ${submission.submission_version} · ${formatDate(submission.submitted_at)}`
                      : "Nội dung trả lời và tệp đính kèm"}
                  </p>
                </div>
                <Badge variant="outline" className="h-8 w-fit gap-1.5 border-border bg-muted/40 px-3 text-[12px] font-bold text-muted-foreground">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {answerCount} ký tự
                </Badge>
              </div>

              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={!canSubmit}
                placeholder="Nhập câu trả lời của bạn..."
                className={cn(
                  "min-h-[220px] w-full resize-y rounded-xl border border-border bg-background px-4 py-4 text-[15px] leading-7 text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10",
                  !canSubmit && "cursor-not-allowed bg-muted/30 text-muted-foreground shadow-none",
                )}
              />

              {submission?.files?.length ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    Tệp đã nộp
                  </div>
                  <FileList files={submission.files} />
                </div>
              ) : null}

              {canSubmit && (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "mt-5 rounded-2xl border border-dashed p-4 transition",
                    isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/20",
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                        <FileUp className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground">Tệp đính kèm</div>
                        <div className="text-[12px] font-medium text-muted-foreground">
                          {files.length}/{MAX_PENDING_FILES} tệp · {formatBytes(selectedFileSize)}
                        </div>
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4" />
                      Chọn tệp
                    </Button>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {files.map((file) => (
                        <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background px-3 py-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-foreground">{file.name}</div>
                            <div className="text-[11px] font-medium text-muted-foreground">{formatBytes(file.size)}</div>
                          </div>
                          <button
                            type="button"
                            title="Xóa tệp"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removePendingFile(file)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[12px] font-semibold text-muted-foreground">{submitHint}</div>
                <Button
                  disabled={!canSubmit || submitMut.isPending || !answer.trim()}
                  onClick={submit}
                  className="h-11 w-full gap-2 px-5 text-[14px] font-bold sm:w-auto"
                >
                  {submitMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : canResubmit ? (
                    <RefreshCcw className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {canResubmit ? "Nộp lại" : "Nộp bài"}
                </Button>
              </div>
            </section>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {isFeedbackGiven && submission && (
              <section className="rounded-2xl border border-success/25 bg-success/10 p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80 text-success shadow-sm">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-success">Phản hồi</div>
                    <div className="mt-0.5 text-[15px] font-bold text-foreground">
                      {submission.feedback_at ? formatDate(submission.feedback_at) : "Đã phản hồi"}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-muted-foreground">
                      Người chấm: <span className="text-success">{feedbackReviewer || "Quản trị viên"}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-success/20 bg-background/70 px-4 py-3">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {assignment.grading_enabled && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[12px] font-bold text-success">
                        <Trophy className="h-3.5 w-3.5" />
                        Điểm {typeof submission.score === "number" ? `${submission.score}/100` : "chưa có"}
                      </span>
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Lời nhận xét
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-[14px] font-medium leading-6 text-foreground">
                    {submission.feedback_text || "Quản trị viên đã phản hồi bài tập."}
                  </div>
                </div>
                {submission.feedback_files.length > 0 && (
                  <div className="mt-4">
                    <FileList files={submission.feedback_files} tone="success" layout="single" />
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
