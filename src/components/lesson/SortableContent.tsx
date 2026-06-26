import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBlockDetail, submitSortableAnswer } from "@/api/blocks";
import { CheckCircle2, GripVertical, Loader2, XCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBlockSubmitStore } from "@/stores/useBlockSubmitStore";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";
import { markBlockComplete } from "@/api/progress";
import { useParams } from "react-router-dom";
import {
  hasProblemMedia,
  normalizeProblemMedia,
  resolveProblemMediaImageUrl,
  type ProblemMedia,
} from "@/lib/problemMedia";
import { storageUrl } from "@/utils/storageUrl";
import { LessonImageCarousel } from "./LessonImageCarousel";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Interfaces ──

interface SortableItem {
  id: number;
  text: string;
}

interface SortableData {
  display_name: string;
  question_text: string;
  completed: boolean;
  score: number;
  items: SortableItem[];
}

// ── Draggable Item Component ──

function SortableRow({ item, index }: { item: SortableItem; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  let wrapperClass =
    "flex items-center gap-3 p-4 rounded-xl border-2 bg-white dark:bg-slate-800 transition-colors shadow-sm select-none ";

  if (isDragging) {
    wrapperClass +=
      "border-primary shadow-xl opacity-90 z-50 ring-2 ring-primary/20 ";
  } else {
    wrapperClass +=
      "border-primary/20 hover:border-primary/40 ";
  }

  return (
    <div ref={setNodeRef} style={style} className={wrapperClass}>
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none p-1 rounded-lg hover:bg-primary/10 text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Index badge */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
        {index + 1}
      </div>

      {/* Text */}
      <span className="flex-1 text-[15px] font-medium leading-relaxed text-foreground">
        {item.text}
      </span>
    </div>
  );
}

// ── Shuffle helper (Fisher-Yates) ──
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Đảm bảo không trùng thứ tự gốc (nếu > 2 items)
  if (arr.length > 2) {
    const isSame = shuffled.every((item, i) => item === arr[i]);
    if (isSame) return shuffleArray(arr);
  }
  return shuffled;
}

// ── Main Component ──

interface SortableContentProps {
  usageKey: string;
  problemMedia?: ProblemMedia | null;
  onImageClick?: (src: string) => void;
}

export function SortableContent({ usageKey, problemMedia, onImageClick }: SortableContentProps) {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const [items, setItems] = useState<SortableItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [started, setStarted] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const username = useAuthStore((s) => s.user?.username);

  // Fetch block detail
  const { data: blockData, isLoading } = useQuery({
    queryKey: ["block-detail", usageKey, username],
    queryFn: () => getBlockDetail(usageKey, username),
    staleTime: 0,
  });

  const svd = blockData?.student_view_data as unknown as SortableData | undefined;

  // Prefer block's SVD media (fresh from getBlockDetail), fallback to prop (from course outline)
  const svdMedia = normalizeProblemMedia((svd as any)?.problem_media);
  const effectiveMedia = hasProblemMedia(svdMedia)
    ? svdMedia
    : normalizeProblemMedia(problemMedia);

  // Initialize items from server data (once) + khôi phục từ session store
  if (svd && !initialized) {
    if (svd.items && svd.items.length > 0) {
      // Khôi phục kết quả từ session store nếu đã submit trước đó
      const cached = useBlockSubmitStore.getState().getResult(usageKey);
      // So sánh fingerprint: nếu admin đã update content → bỏ qua cache
      const currentFingerprint = JSON.stringify(svd.items.map(i => i.text));
      if (cached && cached.contentFingerprint === currentFingerprint) {
        setResultMessage(cached.resultMessage);
        setIsCorrect(cached.isCorrect);
        setStarted(true);
        setItems(svd.items); // Giữ nguyên thứ tự đã submit
      } else {
        if (cached) {
          // Content đã thay đổi → xóa cache cũ
          useBlockSubmitStore.getState().setResult(usageKey, undefined as any);
        }
        // Xáo trộn ngẫu nhiên cho learner
        const shuffled = shuffleArray([...svd.items]);
        setItems(shuffled);
      }
      setInitialized(true);
    }
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      if (active.id === over.id) return;

      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });

      // Clear previous result on re-ordering
      setResultMessage(null);
      setIsCorrect(null);
    },
    []
  );

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (answer: number[]) => submitSortableAnswer(usageKey, answer),
    onSuccess: (data) => {
      if (data.status === "correct") {
        setIsCorrect(true);
        setResultMessage(data.message);
        // Lưu vào session store (kèm fingerprint)
        const fp = svd ? JSON.stringify(svd.items.map(i => i.text)) : '';
        useBlockSubmitStore.getState().setResult(usageKey, {
          resultMessage: data.message,
          isCorrect: true,
          contentFingerprint: fp,
        });
        // Mark block complete (giống edX: chỉ khi đúng)
        if (courseId) {
          markBlockComplete(courseId, usageKey)
            .catch((e) => console.error('Failed to mark sortable complete:', e));
        }
        qc.invalidateQueries({ queryKey: ["block-detail", usageKey] });
        // Refetch progress với retry để bắt kịp backend aggregation
        refetchProgressWithRetry(qc, courseId);
      } else {
        setIsCorrect(false);
        setResultMessage(data.message);
      }
    },
    onError: () => {
      setIsCorrect(false);
      setResultMessage("Không thể kết nối đến máy chủ.");
    },
  });

  const handleSubmit = () => {
    setResultMessage(null);
    setIsCorrect(null);
    const answer = items.map((item) => item.id);
    submitMutation.mutate(answer);
  };

  // ── Render States ──

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!svd) {
    return (
      <div className="text-center p-10 mt-6 rounded-2xl border border-muted bg-muted/20">
        <p className="text-muted-foreground">Không tải được dữ liệu bài tập sắp xếp.</p>
      </div>
    );
  }

  // ── Màn hình Hướng dẫn (Chưa bắt đầu) ──
  if (!started) {
    return (
      <div className="rounded-3xl border-2 border-primary/10 bg-[#F4F9FF] dark:bg-slate-900/50 p-8 shadow-sm relative overflow-hidden">
        {/* Trang trí góc phải */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 opacity-20 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#0247A6" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.7,-2.1C98.6,13.8,94.2,30.3,85.6,44.8C77,59.3,64.2,71.9,49.2,80.3C34.2,88.7,17.1,92.9,0.5,92.1C-16.1,91.3,-32.2,85.4,-46.8,76.5C-61.4,67.6,-74.6,55.7,-83.5,41.1C-92.4,26.5,-97.1,9.2,-95.7,-7.4C-94.3,-24,-86.7,-39.9,-75.6,-51.9C-64.5,-63.9,-49.9,-71.9,-35.5,-78.9C-21.1,-85.9,-10.5,-91.9,2.8,-96.5C16.1,-101.1,30.5,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span 
            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{ backgroundColor: "#43FDD7", color: "#000" }}
          >
            Sắp xếp
          </span>
        </div>
        <h2 className="mb-8 text-[28px] 2xl:text-[34px] font-semibold leading-[36px] 2xl:leading-[42px] text-foreground">
          {svd.display_name || "Sắp xếp đúng thứ tự"}
        </h2>

        <div className="mb-8 pl-4 border-l-4 border-primary">
          <h3 className="text-xl font-bold mb-4">Hướng dẫn</h3>
          <ul className="space-y-3 text-[14px]">
            <li>
              <b>1. Đọc kỹ:</b> Xem xét thứ tự logic hoặc quy trình đúng của các mục.
            </li>
            <li>
              <b>2. Thao tác:</b> Nhấn vào thanh cầm chốt bên trái và kéo thả mục lên/xuống để thay đổi vị trí.
            </li>
            <li>
              <b>3. Kiểm tra:</b> Sau khi bạn hài lòng với thứ tự, nhấn xác nhận để hệ thống chấm điểm bài của bạn.
            </li>
          </ul>
        </div>

        <Button
          onClick={() => setStarted(true)}
          className="h-12 rounded-full px-8 font-bold text-[15px] shadow-lg transition-transform hover:scale-105"
        >
          Bắt đầu <Play className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ── Result Block ──
  let resultBlock = null;
  if (resultMessage) {
    let wrapperClass = "mb-4 w-full max-w-sm flex items-center gap-3 rounded-xl p-4 ";
    let textClass = "font-medium ";
    let icon = null;

    if (isCorrect) {
      wrapperClass += "bg-success/10 border border-success/20";
      textClass += "text-foreground text-[14px]";
      icon = <CheckCircle2 className="h-6 w-6 text-success shrink-0" />;
    } else {
      wrapperClass += "bg-destructive/10 border border-destructive/20";
      textClass += "text-foreground text-[14px]";
      icon = <XCircle className="h-6 w-6 text-destructive shrink-0" />;
    }

    resultBlock = (
      <div className={wrapperClass}>
        {icon}
        <p className={textClass}>{resultMessage}</p>
      </div>
    );
  }

  // ── Spinner ──
  let spinner = null;
  if (submitMutation.isPending) {
    spinner = <Loader2 className="mr-2 h-5 w-5 animate-spin" />;
  }

  // ── Main Render ──
  return (
    <div className="rounded-3xl border-2 border-primary/20 bg-[#F4F9FF] dark:bg-slate-900/50 p-6 md:p-10 shadow-sm relative overflow-hidden">
      <SortableMediaBlock media={effectiveMedia} onImageClick={onImageClick} />
      {/* Badge */}
      <div className="mb-2 flex items-center gap-2">
        <span 
          className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: "#43FDD7", color: "#000" }}
        >
          Sắp xếp
        </span>
      </div>

      {/* Title */}
      <h2 className="mb-4 text-[28px] 2xl:text-[34px] font-semibold leading-[36px] 2xl:leading-[42px] text-foreground">
        {svd.display_name || "Sắp xếp đúng thứ tự"}
      </h2>

      {/* Question text */}
      {svd.question_text && (
        <div className="mb-8 pl-4 border-l-4 border-primary">
          <p className="text-[15px] text-foreground/80 leading-relaxed">
            {svd.question_text}
          </p>
        </div>
      )}

      {/* Sortable list */}
      <div className="w-full max-w-2xl mx-auto mb-8 relative z-10">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {items.map((item, index) => (
                <SortableRow key={item.id} item={item} index={index} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Submit area */}
      <div className="flex flex-col items-center justify-center relative z-10 border-t border-primary/10 pt-6 mt-4">
        {resultBlock}
        {isCorrect !== true && (
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="h-12 w-full max-w-sm rounded-full font-bold text-[15px] shadow-lg"
          >
            {spinner}
            Nộp bài chấm điểm
          </Button>
        )}
      </div>
    </div>
  );
}

function SortableMediaBlock({ media, onImageClick }: { media?: ProblemMedia | null; onImageClick?: (src: string) => void }) {
  const normalized = normalizeProblemMedia(media);
  if (!hasProblemMedia(normalized)) return null;

  const images = normalized.images.map((img) => ({
    ...img,
    src: resolveProblemMediaImageUrl(img.src),
  }));

  return (
    <div className="-mx-6 md:-mx-10 -mt-6 md:-mt-10 mb-8 overflow-hidden rounded-t-[1.35rem] bg-muted/10 border-b-2 border-primary/10 flex flex-col gap-1">
      {/* Uploaded video (takes priority over YouTube) */}
      {normalized.video_storage_path && (
        <div className="relative overflow-hidden w-full aspect-video">
          <video
            src={storageUrl(normalized.video_storage_path)}
            controls
            className="h-full w-full object-contain"
            preload="metadata"
          />
        </div>
      )}

      {/* YouTube embed (only if no uploaded video) */}
      {normalized.youtube_id && !normalized.video_storage_path && (
        <div className="relative overflow-hidden w-full aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${normalized.youtube_id}?rel=0&modestbranding=1&showinfo=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title="Sortable media video"
          />
        </div>
      )}

      {images.length === 1 && (
        <div
          className="relative w-full overflow-hidden flex items-center justify-center cursor-zoom-in"
          onClick={() => onImageClick?.(images[0].src)}
        >
          <img
            src={images[0].src}
            alt={images[0].alt || "Sortable image"}
            className="w-full object-cover max-h-[500px]"
          />
        </div>
      )}

      {images.length >= 2 && (
        <LessonImageCarousel
          images={images}
          onImageClick={onImageClick}
        />
      )}
    </div>
  );
}
