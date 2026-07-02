import { storageUrl } from "@/utils/storageUrl";

export type MediaQuizMode = "single_select" | "multiple_select";
export type MediaQuizMediaType = "image" | "video";

export interface MediaQuizChoice {
  id: string;
  html: string;
}

export interface MediaQuizQuestion {
  id: string;
  mode: MediaQuizMode;
  prompt_html: string;
  explanation_html?: string;
  hints: string[];
  media: {
    type: MediaQuizMediaType;
    storage_path: string;
    alt?: string;
  } | null;
  choices: MediaQuizChoice[];
}

export interface MediaQuizData {
  version: 1;
  mode: MediaQuizMode;
  require_correct_to_advance: true;
  questions: MediaQuizQuestion[];
}

function safeJsonParse(value: string): any {
  try { return JSON.parse(value); } catch { return null; }
}

function parseMediaQuizMode(raw: unknown, fallback: MediaQuizMode): MediaQuizMode {
  return raw === "single_select" || raw === "multiple_select" ? raw : fallback;
}

export function normalizeMediaQuizData(raw: any): MediaQuizData {
  const data = typeof raw === "string" ? safeJsonParse(raw) : raw;
  const mode = parseMediaQuizMode(data?.mode, "single_select");
  const questions = Array.isArray(data?.questions)
    ? data.questions.map((question: any, questionIndex: number): MediaQuizQuestion => {
        const questionMode = parseMediaQuizMode(question?.mode, mode);
        const storagePath = typeof question?.media?.storage_path === "string"
          ? question.media.storage_path.trim()
          : "";
        return {
          id: typeof question?.id === "string" && question.id ? question.id : `q_${questionIndex + 1}`,
          mode: questionMode,
          prompt_html: typeof question?.prompt_html === "string" ? question.prompt_html : "",
          explanation_html: typeof question?.explanation_html === "string" ? question.explanation_html : "",
          hints: Array.isArray(question?.hints)
            ? question.hints
                .filter((hint: unknown): hint is string => typeof hint === "string" && hint.trim().length > 0)
                .slice(0, 10)
            : [],
          media: storagePath
            ? {
                type: question?.media?.type === "video" ? "video" : "image",
                storage_path: storagePath,
                alt: typeof question?.media?.alt === "string" ? question.media.alt : "",
              }
            : null,
          choices: Array.isArray(question?.choices)
            ? question.choices.map((choice: any, choiceIndex: number) => ({
                id: typeof choice?.id === "string" && choice.id ? choice.id : `choice_${choiceIndex}`,
                html: typeof choice?.html === "string" ? choice.html : "",
              }))
            : [],
        };
      })
    : [];

  return {
    version: 1,
    mode,
    require_correct_to_advance: true,
    questions,
  };
}

export function resolveMediaQuizMediaUrl(path: string): string {
  return storageUrl(path) || path;
}
