// ============================================================
// Block Transformer — Open edX blocks → FE Course/Module/Lesson
// Converts the flat block map from Open edX into the nested
// Course → Module → Lesson structure used by the FE.
// ============================================================

import type { BlocksResponse, Block } from "@/api/types";
import type { Course, Module, Lesson, LessonDetail } from "@/data/types";

/**
 * Transform the Open edX blocks response into the FE Course structure.
 * Maps: course → chapters (Modules) → sequentials (Lessons)
 */
export function transformBlocksToCourse(data: BlocksResponse): Course {
  const { root, blocks } = data;
  const rootBlock = blocks[root];

  if (!rootBlock) {
    return { id: root, title: "Unknown Course", modules: [] };
  }

  const chapters = getChildrenOfType(rootBlock, blocks, "chapter");

  return {
    id: root,
    title: rootBlock.display_name,
    modules: chapters.map((chapter, mIdx) => {
      const sequentials = getChildrenOfType(chapter, blocks, "sequential");

      const module: Module = {
        id: chapter.id,
        title: chapter.display_name,
        completed: chapter.completion === 1.0,
        lessons: sequentials.map((seq) => {
          const lesson: Lesson = {
            id: seq.id,
            title: seq.display_name,
            completed: seq.completion === 1.0,
          };
          return lesson;
        }),
      };

      return module;
    }),
  };
}

/**
 * Transform a specific sequential block into a LessonDetail
 * for the LessonDetailPage.
 */
export function transformBlockToLessonDetail(
  sequentialBlock: Block,
  blocks: Record<string, Block>,
  moduleIndex: number,
  lessonIndex: number,
  totalLessons: number
): LessonDetail {
  // Walk into the sequential to find the actual content blocks
  const verticals = getChildrenOfType(sequentialBlock, blocks, "vertical");
  const allComponents: Block[] = [];
  for (const v of verticals) {
    const children = (v.children || [])
      .map((id) => blocks[id])
      .filter(Boolean);
    allComponents.push(...children);
  }

  // Determine lesson type from content
  const type = determineLessonType(allComponents);

  // Extract video data if present
  const videoBlock = allComponents.find((b) => b.type === "video");
  const videoData = videoBlock?.student_view_data as
    | { duration?: number; encoded_videos?: Record<string, { url: string }> }
    | undefined;

  // Extract quiz data if present (from problem block)
  const problemBlock = allComponents.find((b) => b.type === "problem");

  return {
    id: sequentialBlock.id,
    type,
    moduleTag: `MODULE ${String(moduleIndex + 1).padStart(2, "0")}`,
    lessonNumber: `Bài ${lessonIndex + 1} / ${totalLessons}`,
    title: sequentialBlock.display_name,
    videoThumbnail: null,
    videoDuration: videoData?.duration
      ? formatDuration(videoData.duration)
      : "00:00",
    videoCurrentTime: "00:00",
    // Dữ liệu từ API — trả về rỗng, component tự xử lý empty state
    objectives: [],
    description: "",
    bulletPoints: [],
    mentors: [],
    // Quiz: chỉ cung cấp usage key — QuizContent sẽ tải nội dung từ XBlock API
    quizData: undefined,
    // Slide: không hardcode ảnh — SlideContent sẽ tải HTML từ XBlock API
    slideData: undefined,
    // Trường bổ sung cho tích hợp API
    _videoUrl: getVideoUrl(videoData),
    _problemUsageKey: problemBlock?.id || null,
    _htmlBlocks: allComponents
      .filter((b) => b.type === "html")
      .map((b) => b.id),
    _studentViewUrl: sequentialBlock.student_view_url || null,
  };
}

// ── Helpers ──

function getChildrenOfType(
  parent: Block,
  blocks: Record<string, Block>,
  type: string
): Block[] {
  return (parent.children || [])
    .map((id) => blocks[id])
    .filter((b): b is Block => b != null && b.type === type);
}

function determineLessonType(
  components: Block[]
): "video" | "quiz" | "slide" {
  for (const c of components) {
    if (c.type === "problem") return "quiz";
    if (c.type === "video") return "video";
  }
  return "slide";
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getVideoUrl(
  videoData:
    | { encoded_videos?: Record<string, { url: string }> }
    | undefined
): string | null {
  if (!videoData?.encoded_videos) return null;
  // Prefer hls → desktop_mp4 → fallback → youtube
  const priorities = [
    "hls",
    "desktop_mp4",
    "desktop_webm",
    "fallback",
    "youtube",
  ];
  for (const key of priorities) {
    if (videoData.encoded_videos[key]?.url) {
      return videoData.encoded_videos[key].url;
    }
  }
  // Return first available
  const first = Object.values(videoData.encoded_videos)[0];
  return first?.url || null;
}

