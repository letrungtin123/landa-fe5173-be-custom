import type { TFunction } from "i18next";

type SubmitResponse = {
  feedback?: unknown;
  status?: unknown;
};

type SubmitFeedbackOptions = {
  isCorrect: boolean;
  correctKey: string;
  incorrectKey: string;
  unavailableKey?: string;
};

function feedbackCode(response: SubmitResponse): string | null {
  const feedback = response.feedback;
  if (!feedback || typeof feedback !== "object") return null;
  const code = (feedback as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function feedbackParams(response: SubmitResponse): Record<string, number> {
  const feedback = response.feedback;
  if (!feedback || typeof feedback !== "object") return {};
  const params = (feedback as { params?: unknown }).params;
  if (!params || typeof params !== "object") return {};

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
  ) as Record<string, number>;
}

export function getLocalizedSubmitFeedback(
  t: TFunction,
  response: SubmitResponse,
  options: SubmitFeedbackOptions,
): string {
  const code = feedbackCode(response);
  const unavailableKey = options.unavailableKey ?? "quiz.submitUnavailable";

  if (code === "partial_answers") {
    return t("submitFeedback.partialAnswers", feedbackParams(response));
  }
  if (code === "partial_words") {
    return t("submitFeedback.partialWords", feedbackParams(response));
  }
  if (code === "partial_positions") {
    return t("submitFeedback.partialPositions", feedbackParams(response));
  }
  if (
    code === "content_unavailable"
    || code === "question_not_found"
    || code === "round_not_found"
    || code === "answer_not_found"
    || code === "missing_correct_answer"
    || code === "unsupported_problem_type"
    || code === "unsupported_block_type"
    || response.status === "error"
  ) {
    return t(unavailableKey);
  }

  return t(options.isCorrect ? options.correctKey : options.incorrectKey);
}
