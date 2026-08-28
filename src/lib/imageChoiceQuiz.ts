import { storageUrl } from "@/utils/storageUrl";

export interface ImageChoiceQuizChoice {
  id: string;
  html: string;
  image: {
    storage_path: string;
    alt?: string;
  };
}

export interface ImageChoiceQuizData {
  version: 1;
  prompt_html: string;
  hints: string[];
  choices: ImageChoiceQuizChoice[];
}

function safeJsonParse(value: string): any {
  try { return JSON.parse(value); } catch { return null; }
}

export function normalizeImageChoiceQuizData(raw: any): ImageChoiceQuizData {
  const data = typeof raw === "string" ? safeJsonParse(raw) : raw;
  const choices = Array.isArray(data?.choices)
    ? data.choices.slice(0, 4).map((choice: any, choiceIndex: number) => ({
        id: typeof choice?.id === "string" && choice.id ? choice.id : `choice_${choiceIndex + 1}`,
        html: typeof choice?.html === "string" ? choice.html : "",
        image: {
          storage_path: typeof choice?.image?.storage_path === "string" ? choice.image.storage_path : "",
          alt: typeof choice?.image?.alt === "string" ? choice.image.alt : "",
        },
      }))
    : [];

  return {
    version: 1,
    prompt_html: typeof data?.prompt_html === "string" ? data.prompt_html : "",
    hints: Array.isArray(data?.hints)
      ? data.hints
          .filter((hint: unknown): hint is string => typeof hint === "string" && hint.trim().length > 0)
          .slice(0, 10)
      : [],
    choices,
  };
}

export function resolveImageChoiceQuizImageUrl(path: string): string {
  return storageUrl(path) || path;
}
