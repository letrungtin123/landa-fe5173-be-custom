// ============================================================
// useQuiz Hook — Nộp bài kiểm tra và quản lý kết quả
// ============================================================

import { useMutation } from "@tanstack/react-query";
import { submitProblemAnswer } from "@/api/blocks";

interface QuizResult {
  success: boolean;
  correct: boolean;
  score: number;
  message: string;
  contents?: string;
}

/**
 * Hook nộp câu trả lời quiz.
 * KHÔNG tự invalidate queries — caller sẽ quyết định khi nào invalidate
 * dựa trên kết quả đúng/sai.
 */
export function useSubmitQuiz(usageKey: string) {
  return useMutation({
    mutationFn: (answers: Record<string, string | string[]>) =>
      submitProblemAnswer(usageKey, answers),
  });
}

/**
 * Parse kết quả quiz từ response của Open edX.
 */
export function parseQuizResult(
  response: Record<string, unknown>
): QuizResult {
  const contents = response.contents ? String(response.contents) : "";
  const successVal = response.success;
  
  // Xác định chuẩn xác đúng/sai qua HTML response của edX
  const isCorrectStatus = contents.includes('class="status correct"');
  const isIncorrectStatus = contents.includes('class="status incorrect"');
  
  const scoreCorrect = typeof response.current_score === "number" && response.current_score > 0;
  const correct = isCorrectStatus || (scoreCorrect && !isIncorrectStatus);
  const success = successVal !== undefined && successVal !== false;

  const score = typeof response.current_score === "number"
    ? response.current_score
    : 0;

  let message = "Đã nộp bài!";
  if (correct) {
    message = `🎉 Chính xác! Tuyệt vời!`;
  } else if (isIncorrectStatus || success) {
    message = "Chưa đúng. Hãy thử lại!";
  } else {
    message = "Có lỗi xảy ra khi nộp bài.";
  }

  return { 
    success, 
    correct, 
    score, 
    message,
    contents: response.contents ? String(response.contents) : undefined
  };
}
