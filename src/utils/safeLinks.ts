// ============================================================
// Safe links in rendered documents (Word/Excel previews in the library)
//
// docx-preview and the spreadsheet preview build HTML from an uploaded file,
// so a document can carry links such as `javascript:` or `data:`. After the
// preview is rendered, every link that is not http(s), mailto or an in-page
// anchor loses its target, inline event handlers are removed, and external
// links open in a new tab without access to this page.
// ============================================================

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const LINK_ATTRIBUTES = ["href", "xlink:href"];

/** True for http(s), mailto, relative links and in-page anchors. */
export function isSafeLinkHref(href: string | null, baseUrl: string): boolean {
  if (href === null) return true;
  const trimmed = href.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return true;
  try {
    return SAFE_LINK_PROTOCOLS.has(new URL(trimmed, baseUrl).protocol);
  } catch {
    return false;
  }
}

interface ElementLike {
  tagName: string;
  getAttributeNames(): string[];
  getAttribute(name: string): string | null;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
}

interface RootLike {
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
}

/** Returns the number of links that were disabled. */
export function neutralizeUnsafeLinks(root: RootLike, baseUrl: string): number {
  let disabled = 0;
  const elements = Array.from(root.querySelectorAll("*"));
  for (const element of elements) {
    for (const name of element.getAttributeNames()) {
      if (name.toLowerCase().startsWith("on")) element.removeAttribute(name);
    }
    for (const name of LINK_ATTRIBUTES) {
      const href = element.getAttribute(name);
      if (href === null) continue;
      if (!isSafeLinkHref(href, baseUrl)) {
        element.removeAttribute(name);
        disabled += 1;
        continue;
      }
      const tag = element.tagName.toLowerCase();
      if ((tag === "a" || tag === "area") && /^https?:/i.test(href.trim())) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
  }
  return disabled;
}
