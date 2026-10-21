// ============================================================
// quizText.ts — Quiz stem and explanation layout (QC 21/10, B1/B2)
//
// AI ID quizzes store the stem in <label> and the explanation in
// <div class="detailed-solution"><p>…</p></div> as plain text: a line
// feed is a line break, a line starting with "- " is a list item, and the
// explanation is the principle, then one line per option ("A - …").
// Layout only: text is never turned into markup. Old one-line quizzes give
// one bold question line or one explanation line.
// ============================================================

import type { ParsedProblem } from "./problemParser";

export type QuizQuestionBlock =
  | { kind: "line"; text: string; question: boolean }
  | { kind: "list"; items: string[] };
export type QuizExplanationLine =
  | { kind: "text"; text: string }
  | { kind: "option"; letter: string; text: string; correct: boolean };

const LIST_ITEM = /^-\s+(\S.*)$/;
const OPTION_LINE = /^([A-H])\s*(?:[-–—]|[.):])\s+(\S.*)$/;

/** Non-empty lines, trimmed (CR LF and CR count as one line feed). */
function textLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
}

/** Context lines, "- " list items, and the question: the last line, unless it is a list item. */
export function quizQuestionBlocks(text: string): QuizQuestionBlock[] {
  const blocks: QuizQuestionBlock[] = [];
  for (const line of textLines(text)) {
    const item = LIST_ITEM.exec(line);
    const last = blocks[blocks.length - 1];
    if (item && last?.kind === "list") last.items.push(item[1]);
    else if (item) blocks.push({ kind: "list", items: [item[1]] });
    else blocks.push({ kind: "line", text: line, question: false });
  }
  const last = blocks[blocks.length - 1];
  if (last?.kind === "line") last.question = true;
  return blocks;
}

/** One entry per line; "A - …" (or "A. …", "A) …", "A: …") is the line of option A. */
export function quizExplanationLines(text: string, correctLetters: readonly string[] = []): QuizExplanationLine[] {
  return textLines(text).map((line): QuizExplanationLine => {
    const option = OPTION_LINE.exec(line);
    return option
      ? { kind: "option", letter: option[1], text: option[2], correct: correctLetters.includes(option[1]) }
      : { kind: "text", text: line };
  });
}

const NAMED: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(value: string): string {
  return value.replace(/&(?:([a-z]+)|#(\d+)|#x([0-9a-f]+));/gi, (all, name?: string, dec?: string, hex?: string) => {
    if (name) return NAMED[name.toLowerCase()] ?? all;
    const code = Number.parseInt(dec ?? hex ?? "", dec ? 10 : 16);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
  });
}

/**
 * The text of a stem or explanation that is one element without markup
 * (<label>…</label>, <p>…</p>) or bare text, with its line feeds. Null when it
 * holds markup (rich text written in the course editor).
 */
export function plainQuizText(html: string): string | null {
  const trimmed = html.trim();
  const element = /^<(label|p|div|span)(?:\s[^<>]*)?>([^<]*)<\/\1\s*>$/i.exec(trimmed);
  if (element) return decodeEntities(element[2]);
  return trimmed.includes("<") ? null : decodeEntities(trimmed);
}

/**
 * Letters (A, B, …) of the options the learner chose. The explanation is shown
 * only after a correct answer, so these are the correct options.
 */
export function chosenOptionLetters(problem: Pick<ParsedProblem, "type" | "options">, answer: string | string[] | undefined): string[] {
  if (problem.type !== "single-select" && problem.type !== "multi-select") return [];
  const values = Array.isArray(answer) ? answer : answer ? [answer] : [];
  return (problem.options ?? []).flatMap((option, index) =>
    values.includes(option.id) && index < 26 ? [String.fromCharCode(65 + index)] : []);
}

const BLOCK_OR_BREAK = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|BR|DIV|DL|FIGURE|FOOTER|H[1-6]|HEADER|HR|LI|OL|P|PRE|SECTION|TABLE|UL)$/;
/** A line feed at the edge of a text node breaks the line only when inline content continues on that side. */
const continuesInline = (node: Node | null) => !!node && !(node.nodeType === Node.ELEMENT_NODE && BLOCK_OR_BREAK.test((node as Element).tagName));

/**
 * Rich stems and explanations: a line feed inside real text becomes a line
 * break; whitespace-only text between tags (template indentation) is left as
 * whitespace, so it never becomes a blank line. Text stays text nodes.
 */
export function htmlWithTextLineBreaks(html: string): string {
  if (!html.includes("\n") || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (text.data.includes("\n") && text.data.trim() && !text.parentElement?.closest("pre, textarea, code, script, style")) texts.push(text);
  }
  for (const text of texts) {
    let data = text.data.replace(/\r\n?/g, "\n");
    if (!continuesInline(text.previousSibling)) data = data.replace(/^\s*\n\s*/, " ");
    if (!continuesInline(text.nextSibling)) data = data.replace(/\s*\n\s*$/, " ");
    const lines = data.split(/[ \t]*\n+[ \t]*/);
    const fragment = doc.createDocumentFragment();
    lines.forEach((line, index) => {
      if (index > 0) fragment.appendChild(doc.createElement("br"));
      fragment.appendChild(doc.createTextNode(line));
    });
    text.replaceWith(fragment);
  }
  return doc.body.innerHTML;
}
