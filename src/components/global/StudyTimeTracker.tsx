// ============================================================
// StudyTimeTracker — Global component, mount trong ProtectedRoute
//
// Chạy engine đếm thời gian học ở background.
// Render null — không hiển thị gì trên UI.
// ============================================================

import { useStudyTimeEngine } from '@/hooks/useStudyTimeEngine';

export function StudyTimeTracker() {
  useStudyTimeEngine();
  return null;
}
