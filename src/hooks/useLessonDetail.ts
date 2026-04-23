// ============================================================
// useLessonDetail Hook — Giải mã nội dung bài học từ course blocks
// Sequential → Vertical → Components (video/html/problem)
// ============================================================

import { useParams } from "react-router-dom";
import { useCourseBlocksRaw } from "@/hooks/useCourses";
import type { LessonDetail } from "@/data/types";
import type { Block, VideoBlockData } from "@/api/types";

/**
 * Hook lấy chi tiết bài học từ cấu trúc blocks của course.
 * Cấu trúc Open edX: sequential → vertical(s) → component(s)
 * FE hiển thị nội dung từ components (video, html, problem).
 */
export function useLessonDetail(lessonId: string) {
  const { courseId } = useParams();
  const { data: blocksData, isLoading } = useCourseBlocksRaw(courseId || "");

  let lesson: LessonDetail | null = null;

  if (blocksData?.blocks && lessonId) {
    const blocks = blocksData.blocks;
    const sequentialBlock = blocks[lessonId];

    if (sequentialBlock) {
      // Tìm tất cả components bên trong sequential → vertical → components
      const allComponents = getAllComponents(sequentialBlock, blocks);

      // Xác định loại bài học từ components
      const type = determineLessonType(allComponents);

      // Tìm chapter cha để lấy module tag
      const { moduleTag, lessonNumber } = getModuleInfo(
        sequentialBlock,
        blocks,
        blocksData.root
      );

      // Trích xuất video data
      const videoBlock = allComponents.find((b) => b.type === "video");
      const videoData = videoBlock?.student_view_data as VideoBlockData | undefined;

      // Ưu tiên: encoded_videos → student_view_url của video block
      let videoUrl: string | null = null;
      if (videoData?.encoded_videos) {
        videoUrl = resolveVideoUrl(videoData.encoded_videos);
      }
      // Fallback: nếu không có encoded_videos, dùng student_view_url
      if (!videoUrl && videoBlock?.student_view_url) {
        videoUrl = videoBlock.student_view_url;
      }
      const videoDuration = videoData?.duration
        ? formatDuration(videoData.duration)
        : "";

      // Trích xuất problem data
      const problemBlock = allComponents.find((b) => b.type === "problem");

      // Trích xuất html blocks
      const htmlBlocks = allComponents.filter((b) => b.type === "html");
      const htmlBlockIds = htmlBlocks.map((b) => b.id);

      // Lấy nội dung HTML trực tiếp từ student_view_data (nếu có)
      const htmlContent = htmlBlocks
        .map((b) => {
          const svd = b.student_view_data as Record<string, unknown> | undefined;
          return (svd?.data as string) || "";
        })
        .filter(Boolean)
        .join("\n");

      lesson = {
        id: sequentialBlock.id,
        type,
        moduleTag,
        lessonNumber,
        title: sequentialBlock.display_name || "Chưa có tiêu đề",
        videoThumbnail: null,
        videoDuration,
        videoCurrentTime: "00:00",
        objectives: [],
        description: "",
        bulletPoints: [],
        mentors: [],
        _videoUrl: videoUrl,
        _problemUsageKey: problemBlock?.id || null,
        _htmlBlocks: htmlBlockIds,
        _htmlContent: htmlContent || null,
        // Dùng student_view_url của HTML block đầu tiên (cho iframe fallback)
        _studentViewUrl: htmlBlocks[0]?.student_view_url
          || sequentialBlock.student_view_url
          || null,
      };
    }
  }

  return { lesson, isLoading };
}

// ── Helpers ──

/**
 * Đi sâu từ sequential → vertical(s) → lấy tất cả components (video/html/problem).
 */
function getAllComponents(
  sequentialBlock: Block,
  blocks: Record<string, Block>
): Block[] {
  const components: Block[] = [];
  const verticals = (sequentialBlock.children || [])
    .map((id) => blocks[id])
    .filter((b): b is Block => b != null && b.type === "vertical");

  for (const vertical of verticals) {
    const children = (vertical.children || [])
      .map((id) => blocks[id])
      .filter(Boolean);
    components.push(...children);
  }

  return components;
}

/**
 * Xác định loại bài học từ các components bên trong.
 * Ưu tiên: video → problem (quiz) → html (slide)
 */
function determineLessonType(
  components: Block[]
): "video" | "quiz" | "slide" {
  for (const c of components) {
    if (c.type === "video") return "video";
    if (c.type === "problem") return "quiz";
  }
  // Nếu chỉ có html → hiển thị dạng slide
  if (components.some((c) => c.type === "html")) return "slide";
  return "video";
}

/**
 * Tìm chapter cha và vị trí bài học trong module.
 */
function getModuleInfo(
  sequentialBlock: Block,
  blocks: Record<string, Block>,
  rootId: string
): { moduleTag: string; lessonNumber: string } {
  const rootBlock = blocks[rootId];
  if (!rootBlock?.children) return { moduleTag: "", lessonNumber: "" };

  // Duyệt chapters để tìm chapter chứa sequential này
  for (let chIdx = 0; chIdx < rootBlock.children.length; chIdx++) {
    const chapter = blocks[rootBlock.children[chIdx]];
    if (!chapter?.children) continue;

    const seqIndex = chapter.children.indexOf(sequentialBlock.id);
    if (seqIndex !== -1) {
      return {
        moduleTag: `MODULE ${String(chIdx + 1).padStart(2, "0")}`,
        lessonNumber: `Bài ${seqIndex + 1} / ${chapter.children.length}`,
      };
    }
  }

  return { moduleTag: "", lessonNumber: "" };
}

/**
 * Format thời lượng từ giây sang MM:SS.
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Chọn URL video tốt nhất theo thứ tự ưu tiên:
 * HLS → MP4 Desktop → WebM → Fallback → YouTube
 */
function resolveVideoUrl(
  encoded: Record<string, { url: string; file_size?: number }>
): string | null {
  const priorities = ["hls", "desktop_mp4", "desktop_webm", "fallback", "youtube"];
  for (const key of priorities) {
    if (encoded[key]?.url) return encoded[key].url;
  }
  const first = Object.values(encoded)[0];
  return first?.url || null;
}
