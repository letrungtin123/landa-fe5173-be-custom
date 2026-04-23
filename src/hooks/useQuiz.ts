// ============================================================
// useQuiz Hook — Nộp bài kiểm tra và quản lý kết quả
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitProblemAnswer } from "@/api/blocks";

interface QuizResult {
  success: boolean;
  correct: boolean;
  score: number;
  message: string;
}

/**
 * Hook nộp câu trả lời quiz.
 * Sau khi nộp thành công → invalidate progress queries.
 */
export function useSubmitQuiz(usageKey: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (answers: Record<string, string>) =>
      submitProblemAnswer(usageKey, answers),
    onSuccess: () => {
      // Cập nhật lại tiến độ sau khi nộp bài
      qc.invalidateQueries({ queryKey: ["course-completion"] });
      qc.invalidateQueries({ queryKey: ["course-blocks"] });
    },
  });
}

/**
 * Parse kết quả quiz từ response của Open edX.
 */
export function parseQuizResult(
  response: Record<string, unknown>
): QuizResult {
  const success = response.success !== undefined
    ? Boolean(response.success)
    : true;
  const correct = Boolean(response.correct);
  const score = typeof response.current_score === "number"
    ? response.current_score
    : 0;

  let message = "Đã nộp bài!";
  if (correct) {
    message = "🎉 Chính xác! Tuyệt vời!";
  } else if (success) {
    message = "❌ Chưa đúng. Hãy thử lại!";
  }

  return { success, correct, score, message };
}
