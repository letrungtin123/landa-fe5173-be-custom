import { BookOpen, Download, FileText, MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { downloadAssignmentFile, type AssignmentFileMeta } from "@/api/assignments";
import type { Notification } from "@/data/types";

interface FeedbackMetadata {
  course_name?: string;
  assignment_title?: string;
  assignment_question?: string;
  feedback_text?: string;
  feedback_files?: AssignmentFileMeta[];
  feedback_at?: string;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function metadataOf(notification: Notification | null): FeedbackMetadata {
  const metadata = notification?.metadata;
  if (!metadata || typeof metadata !== "object") return {};
  return metadata as FeedbackMetadata;
}

function FeedbackFiles({ files }: { files?: AssignmentFileMeta[] }) {
  if (!files?.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={() => downloadAssignmentFile(file)}
          className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-foreground">{file.original_name}</span>
            <span className="block text-[11px] text-muted-foreground">{file.mime_type || "Tệp đính kèm"}</span>
          </span>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
        </button>
      ))}
    </div>
  );
}

export function AssignmentFeedbackNotificationDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const metadata = metadataOf(notification);
  const courseName = metadata.course_name || "Khóa học";
  const assignmentTitle = metadata.assignment_title || notification?.title || "Bài tập";
  const feedbackText = metadata.feedback_text || notification?.message || "";
  const feedbackAt = metadata.feedback_at || notification?.createdAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-muted/20 px-5 pb-4 pt-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[18px] leading-6">Feedback bài tập</DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2">
                {courseName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(88vh-92px)] overflow-y-auto px-5 py-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/10 px-3 py-1 text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              {courseName}
            </Badge>
            {notification?.sentByName && (
              <Badge variant="outline" className="gap-1.5 border-success/25 bg-success/10 px-3 py-1 text-success">
                <ShieldCheck className="h-3.5 w-3.5" />
                {notification.sentByName}
              </Badge>
            )}
          </div>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Bài tập</div>
            <h3 className="text-[18px] font-bold leading-6 text-foreground">{assignmentTitle}</h3>
            {metadata.assignment_question && (
              <div className="mt-4 rounded-xl border border-border bg-muted/25 px-4 py-3">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Câu hỏi</div>
                <div className="whitespace-pre-wrap text-[14px] leading-6 text-foreground">
                  {metadata.assignment_question}
                </div>
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-success/25 bg-success/10 p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-success">Feedback</div>
              {feedbackAt && <div className="text-[11px] font-medium text-muted-foreground">{formatDate(feedbackAt)}</div>}
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-success/20 bg-background/80 px-4 py-3 text-[14px] leading-6 text-foreground">
              {feedbackText || "Admin đã feedback bài tập."}
            </div>
            <div className="mt-4">
              <FeedbackFiles files={metadata.feedback_files} />
            </div>
          </section>

          <div className="mt-5 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Đã hiểu</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
