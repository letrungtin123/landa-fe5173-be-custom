export const DEMO_IFRAME_GUIDE_SCROLL_LONG_MS = 1800;
export const DEMO_IFRAME_GUIDE_SCROLL_SHORT_MS = 1100;

type DemoIframeSmoothScrollOptions = {
  durationMs?: number;
  container?: HTMLElement | null;
  easing?: "cubic" | "sine";
  onUpdate?: () => void;
  onComplete?: () => void;
};

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function easeInOutSine(progress: number): number {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

function getScrollContainer(element: HTMLElement, container?: HTMLElement | null): HTMLElement | null {
  if (container?.contains(element)) return container;

  const courseScrollEl = document.getElementById("course-main-scroll");
  if (courseScrollEl?.contains(element)) return courseScrollEl;

  return null;
}

export function scrollDemoIframeElementToCenter(
  element: HTMLElement,
  options: DemoIframeSmoothScrollOptions = {}
): () => void {
  const {
    durationMs = DEMO_IFRAME_GUIDE_SCROLL_LONG_MS,
    container,
    easing = "cubic",
    onUpdate,
    onComplete,
  } = options;
  const scrollEl = getScrollContainer(element, container);
  const startTime = window.performance.now();
  let frameId = 0;

  const getScrollTarget = () => {
    if (scrollEl) {
      const containerRect = scrollEl.getBoundingClientRect();
      const targetRect = element.getBoundingClientRect();
      const startTop = scrollEl.scrollTop;
      const rawTargetTop = startTop + targetRect.top - containerRect.top - ((containerRect.height - targetRect.height) / 2);
      const maxTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);

      return {
        startTop,
        targetTop: Math.min(Math.max(0, rawTargetTop), maxTop),
        apply: (top: number) => {
          scrollEl.scrollTop = top;
        },
      };
    }

    const targetRect = element.getBoundingClientRect();
    const startTop = window.scrollY;
    const rawTargetTop = startTop + targetRect.top - ((window.innerHeight - targetRect.height) / 2);
    const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    return {
      startTop,
      targetTop: Math.min(Math.max(0, rawTargetTop), maxTop),
      apply: (top: number) => {
        window.scrollTo(0, top);
      },
    };
  };

  const { startTop, targetTop, apply } = getScrollTarget();
  const distance = targetTop - startTop;

  if (Math.abs(distance) < 1) {
    onUpdate?.();
    onComplete?.();
    return () => {};
  }

  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / durationMs);
    const easedProgress = easing === "sine" ? easeInOutSine(progress) : easeInOutCubic(progress);
    apply(startTop + distance * easedProgress);
    onUpdate?.();

    if (progress < 1) {
      frameId = window.requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  frameId = window.requestAnimationFrame(step);

  return () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
  };
}
