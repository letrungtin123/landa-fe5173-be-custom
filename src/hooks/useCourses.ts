// ============================================================
// useCourses Hook — Course list, enrollment, and structure
// Adapted for Custom Backend
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCourses,
  getCourse,
  getCourseBlocks,
  getMyEnrollments,
  enrollCourse,
} from "@/api/courses";
import { transformBlocksToCourse } from "@/transformers/blockTransformer";
import { useAuthStore } from "@/stores/useAuthStore";
import type { CourseBlocksResponse, CourseBlock, BlocksResponse, Block } from "@/api/types";
import { normalizeHtmlMediaImages } from "@/lib/htmlMedia";
import { normalizeProblemMedia } from "@/lib/problemMedia";

/**
 * Adapter: chuyển CourseBlocksResponse (flat array) → BlocksResponse (map format).
 * Giữ cho tất cả downstream transformers + hooks hoạt động không đổi.
 */
/**
 * Xây dựng student_view_data từ custom BE data/metadata.
 * FE (useLessonDetail) đọc content từ block.student_view_data
 * cho mỗi loại block:
 *   - html: { data: "<p>...</p>" } hoặc { html: "..." }
 *   - video: { encoded_videos: {...}, duration: N }
 *   - la_crossword: { crossword_data: {...} }
 *   - la_sortable: { sortable_data: {...}, question_text: "..." }
 *   - la_diagram: { diagram_data: {...} }
 *   - la_faq: { faq_data: {...} }
 *   - la_pdf: { pdf_url: "..." }
 */
function buildStudentViewData(cb: CourseBlock): Record<string, unknown> {
  const data = cb.data || {};
  const meta = (cb.metadata || {}) as Record<string, unknown>;

  switch (cb.block_type) {
    case 'html': {
      const htmlMedia = {
        images: normalizeHtmlMediaImages((meta?.html_media as any)?.images),
      };
      if (typeof data === 'string') {
        return { data: data, html_media: htmlMedia };
      }
      if (data && typeof data === 'object' && !('data' in data) && !('html' in data)) {
        return { data: JSON.stringify(data), html_media: htmlMedia };
      }
      return { ...(data as Record<string, unknown>), html_media: htmlMedia };
    }

    case 'video': {
      const merged = { ...data as Record<string, unknown>, ...meta };
      if ((merged.url || merged.video_url) && !merged.encoded_videos) {
        merged.encoded_videos = {
          fallback: { url: merged.url || merged.video_url },
        };
      }
      return merged;
    }

    case 'la_crossword': {
      // Unwrap crossword_data → root level { words, keyword_coordinates }
      const cd = (meta?.crossword_data || (typeof (data as any)?.crossword_data === 'string'
        ? safeJsonParse((data as any).crossword_data) : (data as any)?.crossword_data)) as Record<string, unknown> || {};
      return {
        display_name: cb.display_name,
        completed: false,
        score: 0,
        words: ((cd.words as any[]) || []).map((w: any) => ({
          ...w,
          length: w.length || (w.answer ? w.answer.length : 0),
        })),
        keyword_coordinates: cd.keyword_coordinates || [],
        problem_media: normalizeProblemMedia(meta?.problem_media),
      };
    }

    case 'la_faq': {
      const fd = (meta?.faq_data || (typeof (data as any)?.faq_data === 'string'
        ? safeJsonParse((data as any).faq_data) : (data as any)?.faq_data)) as Record<string, unknown> || {};
      return {
        display_name: cb.display_name,
        items: fd.items || (meta?.items as any[]) || [],
      };
    }

    case 'la_sortable': {
      const sd = (meta?.sortable_data || (typeof (data as any)?.sortable_data === 'string'
        ? safeJsonParse((data as any).sortable_data) : (data as any)?.sortable_data)) as Record<string, unknown> || {};
      return {
        display_name: cb.display_name,
        completed: false,
        items: sd.items || [],
        question_text: (meta?.question_text as string) || (data as any)?.question_text || '',
        problem_media: normalizeProblemMedia(meta?.problem_media),
      };
    }

    case 'la_diagram': {
      const dd = (meta?.diagram_data || (typeof (data as any)?.diagram_data === 'string'
        ? safeJsonParse((data as any).diagram_data) : (data as any)?.diagram_data)) as Record<string, unknown> || {};
      return {
        display_name: cb.display_name,
        diagram_data: dd,
      };
    }

    case 'la_pdf':
      return {
        display_name: cb.display_name,
        pdf_url: (meta?.pdf_url as string) || (data as any)?.pdf_url || '',
        ...meta,
      };

    case 'problem': {
      if (typeof data === 'string') {
        return { data: data, html: data, problem_media: normalizeProblemMedia(meta?.problem_media) };
      }
      return { ...(data as Record<string, unknown>), problem_media: normalizeProblemMedia(meta?.problem_media) };
    }

    default:
      return { ...data as Record<string, unknown>, ...meta };
  }
}

function safeJsonParse(str: string): any {
  try { return JSON.parse(str); } catch { return null; }
}

export function adaptBlocksResponse(data: CourseBlocksResponse): BlocksResponse {
  const blockMap: Record<string, Block> = {};

  // Tìm root block
  let rootId = data.root_id || "";

  // Build map + children arrays
  for (const cb of data.blocks) {
    blockMap[cb.id] = {
      id: cb.id,
      type: cb.block_type,
      display_name: cb.display_name,
      children: [],  // sẽ fill ở bước sau
      completion: cb.completed ? 1 : 0,
      student_view_data: buildStudentViewData(cb),
      student_view_url: (cb.metadata as any)?.student_view_url || undefined,
      graded: (cb.metadata as any)?.graded || false,
    };

    // Auto-detect root nếu không có root_id
    if (!rootId && cb.block_type === "course") {
      rootId = cb.id;
    }
  }

  // Build children arrays từ parent_id
  for (const cb of data.blocks) {
    if (cb.parent_id && blockMap[cb.parent_id]) {
      if (!blockMap[cb.parent_id].children) {
        blockMap[cb.parent_id].children = [];
      }
      blockMap[cb.parent_id].children!.push(cb.id);
    }
  }

  // Sort children theo sort_order
  const sortOrderMap = new Map<string, number>();
  for (const cb of data.blocks) {
    sortOrderMap.set(cb.id, cb.sort_order);
  }
  for (const block of Object.values(blockMap)) {
    if (block.children && block.children.length > 1) {
      block.children.sort((a, b) => (sortOrderMap.get(a) || 0) - (sortOrderMap.get(b) || 0));
    }
  }

  return { root: rootId, blocks: blockMap };
}

/**
 * Lấy danh sách khóa học.
 * Custom BE xử lý logic phân quyền theo role:
 * - learner: chỉ courses assign qua team
 * - staff/superuser/superadmin: toàn bộ trong tenant
 */
export function useCourses(searchTerm?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["courses", searchTerm],
    queryFn: () => getCourses({
      search: searchTerm || undefined,
      page_size: 200,
    }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Lấy danh sách khóa học theo category (có phân trang).
 */
export function useCoursesByCategory(
  categoryId: string | undefined,
  opts?: { search?: string; page?: number; page_size?: number },
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["courses", "category", categoryId, opts?.search, opts?.page, opts?.page_size],
    queryFn: () => getCourses({
      category_id: categoryId,
      search: opts?.search || undefined,
      page: opts?.page,
      page_size: opts?.page_size || 20,
    }),
    enabled: isAuthenticated && !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Lấy chi tiết 1 khóa học.
 */
export function useCourse(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
    enabled: isAuthenticated && !!courseId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Lấy enrollments của user kèm progress.
 */
export function useMyEnrollments() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["enrollments"],
    queryFn: getMyEnrollments,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Lấy cấu trúc blocks khóa học (transformed → Course type).
 * Auto-enroll nếu chưa enrolled.
 */
export function useCourseStructure(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["course-blocks", courseId],
    queryFn: async () => {
      try {
        const raw = await getCourseBlocks(courseId);
        return adaptBlocksResponse(raw);
      } catch (err: any) {
        if (err?.response?.status === 403 || err?.response?.status === 400) {
          try {
            await enrollCourse(courseId);
            qc.invalidateQueries({ queryKey: ["enrollments"] });
          } catch { /* ignore */ }
          const raw = await getCourseBlocks(courseId);
          return adaptBlocksResponse(raw);
        }
        throw err;
      }
    },
    enabled: isAuthenticated && !!courseId,
    staleTime: 5 * 60 * 1000,
    select: (data) => transformBlocksToCourse(data),
  });
}

/**
 * Lấy raw blocks data (adapted to BlocksResponse map format).
 * Dùng bởi useLessonDetail và các hooks cần truy cập block map.
 */
export function useCourseBlocksRaw(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["course-blocks", courseId],
    queryFn: async () => {
      try {
        const raw = await getCourseBlocks(courseId);
        const adapted = adaptBlocksResponse(raw);
        return adapted;
      } catch (err: any) {
        console.error('[useCourseBlocksRaw] ERROR:', err?.response?.status, err?.message);
        if (err?.response?.status === 403 || err?.response?.status === 400) {
          try {
            await enrollCourse(courseId);
            qc.invalidateQueries({ queryKey: ["enrollments"] });
          } catch { /* ignore */ }
          const raw = await getCourseBlocks(courseId);
          return adaptBlocksResponse(raw);
        }
        throw err;
      }
    },
    enabled: isAuthenticated && !!courseId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation ghi danh vào khóa học.
 */
export function useEnrollCourse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: enrollCourse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
