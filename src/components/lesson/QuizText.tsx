// ============================================================
// QuizText — câu hỏi và giải thích của quiz (QC 21/10, B1/B2)
//
// Plain AI ID text keeps its lines: context in normal weight, "- " lines as
// a list, only the question line in bold, at a moderate size; the
// explanation shows one line per option with the correct one highlighted.
// React text only. Rich text from the course editor stays sanitized HTML.
// ============================================================

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { CheckCircle2 } from "lucide-react";
import {
  htmlWithTextLineBreaks,
  plainQuizText,
  quizExplanationLines,
  quizQuestionBlocks,
} from "@/transformers/quizText";

const richHtml = (html: string) => htmlWithTextLineBreaks(DOMPurify.sanitize(html));

export function QuizQuestion({ html }: { html: string }) {
  const plain = useMemo(() => plainQuizText(html), [html]);
  const rich = useMemo(() => (plain?.trim() ? "" : richHtml(html)), [html, plain]);
  if (plain?.trim()) {
    return (
      <div data-quiz-question="" className="mb-8 space-y-3 break-words text-[16px] leading-7 text-foreground md:text-[18px] md:leading-8">
        {quizQuestionBlocks(plain).map((block, index) => block.kind === "list" ? (
          <ul key={index} className="list-disc space-y-1.5 pl-6">
            {block.items.map((item, at) => <li key={at}>{item}</li>)}
          </ul>
        ) : (
          <p key={index} className={block.question ? "font-bold" : "font-normal text-foreground/85"}>{block.text}</p>
        ))}
      </div>
    );
  }
  return (
    <div
      className="mb-8 break-words text-[17px] font-semibold leading-relaxed text-foreground md:text-[19px] [&_br]:block [&_p]:my-0"
      dangerouslySetInnerHTML={{ __html: rich }}
    />
  );
}

export function QuizExplanation({ html, correctLetters, correctLabel }: {
  html: string;
  correctLetters: readonly string[];
  correctLabel: string;
}) {
  const plain = useMemo(() => plainQuizText(html), [html]);
  const rich = useMemo(() => (plain?.trim() ? "" : richHtml(html)), [html, plain]);
  if (plain?.trim()) {
    return (
      <div data-quiz-explanation="" className="space-y-1.5 break-words text-[14px] leading-relaxed text-foreground/90">
        {quizExplanationLines(plain, correctLetters).map((line, index) => line.kind === "text" ? (
          <p key={index}>{line.text}</p>
        ) : (
          <p
            key={index}
            data-correct={line.correct ? "true" : undefined}
            className={`flex items-start gap-2 rounded-lg px-2 py-1 ${line.correct ? "bg-success/15 font-semibold text-foreground" : ""}`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${line.correct ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
              {line.letter}
            </span>
            <span className="min-w-0 flex-1">{line.text}</span>
            {line.correct && (
              <>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span className="sr-only">{correctLabel}</span>
              </>
            )}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div
      className="prose prose-sm prose-success dark:prose-invert max-w-none text-[14px] leading-relaxed text-foreground/90"
      dangerouslySetInnerHTML={{ __html: rich }}
    />
  );
}
