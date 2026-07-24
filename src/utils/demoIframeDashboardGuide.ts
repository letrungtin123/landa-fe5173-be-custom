export const DEMO_IFRAME_DASHBOARD_CTA_EVENT = "demo-iframe-dashboard-cta-ready";
export const DEMO_IFRAME_COMPANION_WIDGET_EVENT = "demo-iframe-companion-widget-start";
export const DEMO_IFRAME_EXPLORE_COURSE_EVENT = "demo-iframe-explore-course-start";
export const DEMO_IFRAME_FLOW_LOCK_EVENT = "demo-iframe-flow-lock-change";
export const DEMO_IFRAME_LESSON_QUIZ_ASSIST_EVENT = "demo-iframe-lesson-quiz-assist-start";
export const DEMO_IFRAME_LESSON_QUIZ_GUIDE_EVENT = "demo-iframe-lesson-quiz-guide-start";
export const DEMO_IFRAME_COMPANION_WIDGET_DELAY_MS = 1000;
export const DEMO_IFRAME_COMPANION_REVEAL_CLOSE_DELAY_MS = 5000;
export const DEMO_IFRAME_LESSON_QUIZ_GUIDE_WIDGET_CLOSE_DELAY_MS = 2000;
export const DEMO_IFRAME_LESSON_QUIZ_HINT_TO_ANSWER_DELAY_MS = 2000;
export const DEMO_IFRAME_EXPLORE_COURSE_ID = "course-v1:Nesso+PRODUCTS+2026";
export const DEMO_IFRAME_LESSON_QUIZ_QUESTION = "Tình huống khách hàng: Team tôi chỉ có tài liệu thô và vài ghi chú rời rạc. Nesso có làm thành bài học được không?";
export const DEMO_IFRAME_LESSON_QUIZ_ASSIST_ANSWER = "Mình hoàn toàn có thể bắt đầu ngay từ tài liệu thô. Chỉ cần bổ sung thêm một chút về đối tượng người học, mục tiêu mong muốn và những nội dung cần giữ nguyên, thì phần triển khai sẽ sát nhu cầu và hiệu quả hơn rất nhiều. Trước khi sử dụng, người phụ trách rà soát lại một lượt là có thể yên tâm đưa vào áp dụng.";

export type DemoIframeFlowLockDetail = {
  source: string;
  locked: boolean;
};

export type DemoIframeLessonQuizAssistDetail = {
  question?: string;
  answer?: string;
};

export type DemoIframeLessonQuizGuidePhase = "idle" | "hint" | "hint-waiting" | "answer" | "submit";

export function setDemoIframeFlowLock(source: string, locked: boolean): void {
  if (!source || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DemoIframeFlowLockDetail>(DEMO_IFRAME_FLOW_LOCK_EVENT, {
      detail: { source, locked },
    })
  );
}

export function demoIframeDashboardCtaKey(
  userId?: string | null,
  loginSessionId?: string | null
): string {
  if (!userId) return "";
  return `demo_iframe_dashboard_cta_ready_${userId}_${loginSessionId || "rehydrated"}`;
}

export function markDemoIframeDashboardCtaPending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

export function isDemoIframeDashboardCtaPending(key: string): boolean {
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function clearDemoIframeDashboardCtaPending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

export function demoIframeCompanionWidgetKey(
  userId?: string | null,
  loginSessionId?: string | null
): string {
  if (!userId) return "";
  return `demo_iframe_companion_widget_${userId}_${loginSessionId || "rehydrated"}`;
}

export function markDemoIframeCompanionWidgetPending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

export function isDemoIframeCompanionWidgetPending(key: string): boolean {
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function clearDemoIframeCompanionWidgetPending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

export function demoIframeExploreCourseKey(
  userId?: string | null,
  loginSessionId?: string | null
): string {
  if (!userId) return "";
  return `demo_iframe_explore_course_${userId}_${loginSessionId || "rehydrated"}`;
}

export function markDemoIframeExploreCoursePending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

export function isDemoIframeExploreCoursePending(key: string): boolean {
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function clearDemoIframeExploreCoursePending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

export function demoIframeLessonVideoKey(
  userId?: string | null,
  loginSessionId?: string | null
): string {
  if (!userId) return "";
  return `demo_iframe_lesson_video_${userId}_${loginSessionId || "rehydrated"}`;
}

export function markDemoIframeLessonVideoPending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

export function isDemoIframeLessonVideoPending(key: string): boolean {
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function clearDemoIframeLessonVideoPending(key: string): void {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}
