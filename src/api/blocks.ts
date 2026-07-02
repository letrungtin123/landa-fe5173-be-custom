// ============================================================
// Blocks & XBlock Content API
// ============================================================

import { apiClient } from "./client";
import type { Block } from "./types";
import { normalizeHtmlMediaImages } from "@/lib/htmlMedia";
import { normalizeProblemMedia } from "@/lib/problemMedia";
import { normalizeMediaQuizData } from "@/lib/mediaQuiz";

/**
 * Lấy chi tiết block đơn lẻ.
 * Dùng custom BE endpoint + build student_view_data đúng format cho mỗi loại block.
 */
export async function getBlockDetail(usageKey: string, _username?: string): Promise<Block> {
  try {
    const { data } = await apiClient.get<any>(
      `/api/learner/blocks/${encodeURIComponent(usageKey)}`
    );
    const raw = data.data || data;
    const blockType = raw.block_type || 'unknown';
    const rawData = raw.data || {};
    const meta = raw.metadata || {};



    const svd = buildBlockStudentViewData(blockType, rawData, meta, raw.display_name);


    return {
      id: raw.id,
      type: blockType,
      display_name: raw.display_name,
      children: [],
      completion: raw.completed ? 1 : 0,
      student_view_data: svd,
      student_view_url: meta?.student_view_url || undefined,
      graded: meta?.graded || false,
    };
  } catch (err) {
    console.error('[getBlockDetail] ERROR for', usageKey, err);
    return {
      id: usageKey,
      type: 'unknown',
      display_name: '',
      children: [],
      completion: 0,
      student_view_data: {},
    };
  }
}

/**
 * Build student_view_data đúng format cho mỗi loại block.
 * CrosswordContent expects: { words, keyword_coordinates, display_name }
 * FaqContent expects: { items, display_name }
 * SortableContent expects: { sortable_data, question_text, display_name }
 * QuizContent expects: HTML string (qua getXBlockHtml)
 * PdfContent expects: { pdf_url, display_name }
 */
function buildBlockStudentViewData(
  blockType: string,
  rawData: any,
  meta: any,
  displayName?: string,
): Record<string, unknown> {
  switch (blockType) {
    case 'la_crossword': {
      // DB format 1 (edX xblock): metadata.crossword_data = { words: [...] }
      // DB format 2 (direct): metadata.words = [...], metadata.grid_size = 10
      // Component expects: svd.words, svd.keyword_coordinates at root
      const cd = meta?.crossword_data || (typeof rawData?.crossword_data === 'string'
        ? safeJsonParse(rawData.crossword_data) : rawData?.crossword_data) || null;
      const words = cd?.words || meta?.words || rawData?.words || [];
      return {
        display_name: displayName,
        completed: false,
        score: 0,
        words: words.map((w: any) => ({
          ...w,
          length: w.length || (w.answer ? w.answer.length : 0),
        })),
        keyword_coordinates: cd?.keyword_coordinates || meta?.keyword_coordinates || [],
        grid_size: cd?.grid_size || meta?.grid_size || 10,
        problem_media: normalizeProblemMedia(meta?.problem_media),
      };
    }

    case 'la_faq': {
      // DB format 1 (edX xblock): metadata.faq_data = { items: [...] }
      // DB format 2 (direct): metadata.items = [...]
      // Component expects: svd.items at root
      const fd = meta?.faq_data || (typeof rawData?.faq_data === 'string'
        ? safeJsonParse(rawData.faq_data) : rawData?.faq_data) || null;
      return {
        display_name: displayName,
        items: fd?.items || meta?.items || rawData?.items || [],
      };
    }

    case 'la_sortable': {
      // DB format 1 (edX xblock): metadata.sortable_data = { items: [...] }
      // DB format 2 (direct): metadata.items = [...]
      // SortableContent expects: svd.items at root, svd.question_text
      const sd = meta?.sortable_data || (typeof rawData?.sortable_data === 'string'
        ? safeJsonParse(rawData.sortable_data) : rawData?.sortable_data) || null;
      return {
        display_name: displayName,
        completed: false,
        items: sd?.items || meta?.items || rawData?.items || [],
        question_text: meta?.question_text || rawData?.question_text || sd?.question_text || '',
        problem_media: normalizeProblemMedia(meta?.problem_media),
      };
    }

    case 'la_diagram': {
      // DB: metadata.diagram_data = { diagrams: [...], start_diagram_id: "..." }
      // Component expects: svd.diagram_data (wrapped)
      const dd = meta?.diagram_data || (typeof rawData?.diagram_data === 'string'
        ? safeJsonParse(rawData.diagram_data) : rawData?.diagram_data) || {};
      return {
        display_name: displayName,
        diagram_data: dd,
      };
    }

    case 'la_pdf': {
      // DB: metadata = { pdf_url, display_name, ... }
      // Component expects: svd.pdf_url
      return {
        display_name: displayName,
        pdf_url: meta?.pdf_url || rawData?.pdf_url || '',
        ...meta,
      };
    }

    case 'html': {
      // DB: data = "<p>HTML content</p>" (string)
      // Component (getXBlockHtml) expects: svd.data = HTML string
      const htmlMedia = { images: normalizeHtmlMediaImages(meta?.html_media?.images) };
      if (typeof rawData === 'string') {
        return { data: rawData, html_media: htmlMedia };
      }
      return { ...(rawData as Record<string, unknown>), html_media: htmlMedia };
    }

    case 'video': {
      // DB: data = { url, duration } or metadata = { video_url }
      const merged = { ...(rawData as Record<string, unknown>), ...meta };
      if ((merged.url || merged.video_url) && !merged.encoded_videos) {
        merged.encoded_videos = {
          fallback: { url: merged.url || merged.video_url },
        };
      }
      return merged;
    }

    case 'problem': {
      // DB: data = "<problem>XML</problem>" (string)
      // QuizContent uses getXBlockHtml → needs raw data string
      if (typeof rawData === 'string') {
        return { data: rawData, html: rawData, problem_media: normalizeProblemMedia(meta?.problem_media) };
      }
      return { ...(rawData as Record<string, unknown>), problem_media: normalizeProblemMedia(meta?.problem_media) };
    }

    case 'la_media_quiz':
      return {
        display_name: displayName,
        media_quiz_data: normalizeMediaQuizData(rawData),
      };

    default:
      return { ...(rawData as Record<string, unknown>), ...meta };
  }
}

function safeJsonParse(str: string): any {
  try { return JSON.parse(str); } catch { return null; }
}

/**
 * Lấy rendered HTML content của block.
 * Custom BE: HTML content lưu trong block.data (JSONB).
 */
export async function getXBlockHtml(usageKey: string): Promise<string> {
  try {
    const block = await getBlockDetail(usageKey);
    const svd = block.student_view_data as Record<string, unknown>;
    const html = (svd?.data as string) || (svd?.html as string) || '';
    if (html) return html;
    throw new Error('Block has no HTML content');
  } catch (error) {
    console.error("[getXBlockHtml] Failed:", error);
    return '<p>Không thể tải nội dung</p>';
  }
}

/**
 * Submit đáp án quiz/problem.
 * Custom BE: POST /api/learner/blocks/:blockId/submit
 */
export async function submitProblemAnswer(
  usageKey: string,
  answers: Record<string, string | string[]>
): Promise<Record<string, unknown>> {
  try {
    const { data } = await apiClient.post(
      `/api/learner/blocks/${encodeURIComponent(usageKey)}/submit`,
      { answers }
    );
    return (data as any).data || data;
  } catch {
    return { success: false, message: 'Submit chưa được hỗ trợ' };
  }
}

/**
 * Submit đáp án Đố Vui Ô Chữ.
 * Custom BE: POST /api/learner/blocks/:blockId/submit
 */
export async function submitMediaQuizAnswer(
  usageKey: string,
  questionId: string,
  answer: string | string[]
): Promise<Record<string, unknown>> {
  try {
    const { data } = await apiClient.post(
      `/api/learner/blocks/${encodeURIComponent(usageKey)}/submit`,
      { question_id: questionId, answer }
    );
    return (data as any).data || data;
  } catch {
    return { status: 'error', message: 'Chưa thể gửi câu trả lời' };
  }
}

export async function submitCrosswordAnswer(
  usageKey: string,
  answers: Record<string, string>
): Promise<{ status: string; message: string; score?: number }> {
  try {
    const { data } = await apiClient.post(
      `/api/learner/blocks/${encodeURIComponent(usageKey)}/submit`,
      { answers }
    );
    return (data as any).data || data;
  } catch {
    return { status: 'error', message: 'Submit chưa được hỗ trợ' };
  }
}

/**
 * Submit đáp án Sắp Xếp Đúng Thứ Tự.
 * Custom BE: POST /api/learner/blocks/:blockId/submit
 */
export async function submitSortableAnswer(
  usageKey: string,
  answer: number[]
): Promise<{ status: string; message: string; score?: number }> {
  try {
    const { data } = await apiClient.post(
      `/api/learner/blocks/${encodeURIComponent(usageKey)}/submit`,
      { answer }
    );
    return (data as any).data || data;
  } catch {
    return { status: 'error', message: 'Submit chưa được hỗ trợ' };
  }
}

/**
 * Lấy hint (gợi ý).
 * Custom BE chưa implement → trả empty.
 */
export async function fetchHint(
  _usageKey: string,
  _hintIndex: number = 0
): Promise<{ hint: string; hasMoreHints: boolean }> {
  return { hint: '', hasMoreHints: false };
}

/**
 * Lấy giải thích đáp án.
 * Custom BE chưa implement → trả empty.
 */
export async function fetchExplanation(
  _usageKey: string
): Promise<{ explanationHtml: string; answers: Record<string, string> }> {
  return { explanationHtml: '', answers: {} };
}
