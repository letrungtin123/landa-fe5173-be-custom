const DEMO_SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "ArrowLeft",
  "ArrowRight",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
  "Spacebar",
  "Tab",
]);

let lockCount = 0;
let restoreScrollLock: (() => void) | null = null;
const SCROLL_LOCK_CLASS = "demo-iframe-guide-scroll-locked";

type DemoIframeUserScrollLockOptions = {
  lockOverflow?: boolean;
};

export function lockDemoIframeUserScroll(options: DemoIframeUserScrollLockOptions = {}): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const lockOverflow = options.lockOverflow ?? true;
  lockCount += 1;
  if (restoreScrollLock) {
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && restoreScrollLock) {
        restoreScrollLock();
        restoreScrollLock = null;
      }
    };
  }

  const body = document.body;
  const docEl = document.documentElement;
  const courseScrollEl = document.getElementById("course-main-scroll");
  const previous = {
    bodyOverflow: body.style.overflow,
    bodyOverscrollBehavior: body.style.overscrollBehavior,
    bodyTouchAction: body.style.touchAction,
    docOverflow: docEl.style.overflow,
    docOverscrollBehavior: docEl.style.overscrollBehavior,
    courseOverflowY: courseScrollEl?.style.overflowY || "",
    courseOverscrollBehavior: courseScrollEl?.style.overscrollBehavior || "",
  };

  const blockScroll = (event: Event) => {
    event.preventDefault();
  };
  const blockKeys = (event: KeyboardEvent) => {
    if (DEMO_SCROLL_KEYS.has(event.key)) {
      event.preventDefault();
    }
  };

  if (lockOverflow) {
    body.style.overflow = "hidden";
    docEl.style.overflow = "hidden";
    if (courseScrollEl) {
      courseScrollEl.style.overflowY = "hidden";
    }
  }
  body.style.overscrollBehavior = "none";
  body.style.touchAction = "none";
  body.classList.add(SCROLL_LOCK_CLASS);
  docEl.style.overscrollBehavior = "none";
  docEl.classList.add(SCROLL_LOCK_CLASS);
  if (courseScrollEl) {
    courseScrollEl.style.overscrollBehavior = "none";
    courseScrollEl.classList.add(SCROLL_LOCK_CLASS);
  }

  window.addEventListener("wheel", blockScroll, { passive: false, capture: true });
  window.addEventListener("touchmove", blockScroll, { passive: false, capture: true });
  window.addEventListener("keydown", blockKeys, true);

  restoreScrollLock = () => {
    body.style.overflow = previous.bodyOverflow;
    body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
    body.style.touchAction = previous.bodyTouchAction;
    body.classList.remove(SCROLL_LOCK_CLASS);
    docEl.style.overflow = previous.docOverflow;
    docEl.style.overscrollBehavior = previous.docOverscrollBehavior;
    docEl.classList.remove(SCROLL_LOCK_CLASS);
    if (courseScrollEl) {
      courseScrollEl.style.overflowY = previous.courseOverflowY;
      courseScrollEl.style.overscrollBehavior = previous.courseOverscrollBehavior;
      courseScrollEl.classList.remove(SCROLL_LOCK_CLASS);
    }

    window.removeEventListener("wheel", blockScroll, true);
    window.removeEventListener("touchmove", blockScroll, true);
    window.removeEventListener("keydown", blockKeys, true);
  };

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0 && restoreScrollLock) {
      restoreScrollLock();
      restoreScrollLock = null;
    }
  };
}
