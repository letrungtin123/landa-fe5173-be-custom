// Quiz stem and explanation layout (QC 21/10, B1/B2). Pure rules and the
// plain-text components run in Node; the OLX parser end to end runs in an
// offline browser when Playwright is available (TEST_PLAYWRIGHT_MODULE /
// TEST_BROWSER_CHANNEL, as in problemParser.test.mjs), skipped otherwise.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, before, test } from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(directory, '..');
const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const loaded = new Map();
function load(file) {
  if (loaded.has(file)) return loaded.get(file);
  const module = { exports: {} };
  loaded.set(file, module.exports);
  const localRequire = specifier => {
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/') ? path.join(src, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
      return load([`${base}.ts`, `${base}.tsx`].find(candidate => { try { readFileSync(candidate); return true; } catch { return false; } }));
    }
    return require(specifier);
  };
  new Function('require', 'module', 'exports', compile(readFileSync(file, 'utf8')))(localRequire, module, module.exports);
  loaded.set(file, module.exports);
  return module.exports;
}
const quiz = load(path.join(directory, 'quizText.ts'));
const { QuizQuestion, QuizExplanation } = load(path.join(src, 'components/lesson/QuizText.tsx'));
const h = React.createElement;

const stem = 'Chị Lan quản lý một cửa hàng có hai việc gấp:\n- Khách chờ đổi hàng\n- Kho báo thiếu hàng\nChị nên làm gì trước?';
const explanation = 'Nguyên tắc: việc chạm tới khách hàng được xử lý trước.\nA - Sai vì kho có thể chờ.\nB - Đúng vì khách đang chờ tại quầy.';

test('stem: context lines, one list item per "- " line, the last line is the question; old one-line stems stay one line', () => {
  assert.deepEqual(quiz.quizQuestionBlocks(stem), [
    { kind: 'line', text: 'Chị Lan quản lý một cửa hàng có hai việc gấp:', question: false },
    { kind: 'list', items: ['Khách chờ đổi hàng', 'Kho báo thiếu hàng'] },
    { kind: 'line', text: 'Chị nên làm gì trước?', question: true },
  ]);
  assert.deepEqual(quiz.quizQuestionBlocks('Câu hỏi cũ?'), [{ kind: 'line', text: 'Câu hỏi cũ?', question: true }]);
  assert.deepEqual(quiz.quizQuestionBlocks('A\r\n\r\n - x \r-5 độ?'), [{ kind: 'line', text: 'A', question: false },
    { kind: 'list', items: ['x'] }, { kind: 'line', text: '-5 độ?', question: true }]);
  // "\n \n" (a line of spaces) is never an empty line.
  assert.deepEqual(quiz.quizQuestionBlocks('Bối cảnh\n \n\t\n  \nHỏi?'), [{ kind: 'line', text: 'Bối cảnh', question: false },
    { kind: 'line', text: 'Hỏi?', question: true }]);
  assert.equal(quiz.quizExplanationLines('Nguyên tắc\n \n\nA - Đúng vì x.\n \n').length, 2);
  const html = renderToStaticMarkup(h(QuizQuestion, { html: '<label>Bối cảnh\n \nHỏi?</label>' }));
  assert.equal((html.match(/<p[ >]/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<p[^>]*><\/p>|<br/);
});

test('explanation: one line per option, the correct ones marked; an old one-line explanation stays as it was', () => {
  assert.deepEqual(quiz.quizExplanationLines(explanation, ['B']).map(line => [line.kind, line.letter ?? null, line.correct ?? null]),
    [['text', null, null], ['option', 'A', false], ['option', 'B', true]]);
  assert.deepEqual(quiz.quizExplanationLines('Một dòng, A - x. B - y.'), [{ kind: 'text', text: 'Một dòng, A - x. B - y.' }]);
});

test('plain text: one element without markup or bare text, with its line feeds; markup is not plain', () => {
  assert.equal(quiz.plainQuizText('\n  <label>Bối cảnh &amp; số\n- 5 &lt; 7\nHỏi?</label>  \n'), 'Bối cảnh & số\n- 5 < 7\nHỏi?');
  assert.equal(quiz.plainQuizText('<p>A &apos;x&apos; &quot;y&quot; &#65; &nbsp;</p>'), 'A \'x\' "y" A \u00a0');
  assert.equal(quiz.plainQuizText('Câu trả lời của bạn là:'), 'Câu trả lời của bạn là:');
  for (const rich of ['<p>Một</p>\n<p>Hai</p>', '<label>Câu <b>đậm</b></label>', '<img src=x onerror=alert(1)>']) assert.equal(quiz.plainQuizText(rich), null, rich);
});

test('the explanation highlights the options the learner chose (it is shown only after a correct answer)', () => {
  const options = [{ id: 'choice_0', text: 'A' }, { id: 'choice_1', text: 'B' }, { id: 'choice_2', text: 'C' }];
  assert.deepEqual(quiz.chosenOptionLetters({ type: 'single-select', options }, 'choice_1'), ['B']);
  assert.deepEqual(quiz.chosenOptionLetters({ type: 'multi-select', options }, ['choice_2', 'choice_0']), ['A', 'C']);
  assert.deepEqual(quiz.chosenOptionLetters({ type: 'dropdown', options }, 'choice_1'), []);
  assert.deepEqual(quiz.chosenOptionLetters({ type: 'text-input' }, '42'), []);
});

test('plain components: normal-weight context, a real list, only the question in bold, moderate size; text never becomes markup', () => {
  const html = renderToStaticMarkup(h(QuizQuestion, { html: `<label>${stem}</label>` }));
  assert.match(html, /^<div data-quiz-question="" class="[^"]*text-\[16px\][^"]*md:text-\[18px\]/);
  assert.doesNotMatch(html, /text-\[20px\]|text-\[24px\]|whitespace-pre-wrap/);
  assert.match(html, /<p class="font-normal[^"]*">Chị Lan quản lý một cửa hàng có hai việc gấp:<\/p><ul class="list-disc[^"]*"><li>Khách chờ đổi hàng<\/li><li>Kho báo thiếu hàng<\/li><\/ul><p class="font-bold">Chị nên làm gì trước\?<\/p>/);
  const hostile = renderToStaticMarkup(h(QuizQuestion, { html: '<label>Xem &lt;img src=x onerror=alert(1)&gt;\nHỏi?</label>' }));
  assert.doesNotMatch(hostile, /<img/);
  assert.match(hostile, /Xem &lt;img src=x onerror=alert\(1\)&gt;/);
  const why = renderToStaticMarkup(h(QuizExplanation, { html: `<p>${explanation}</p>`, correctLetters: ['B'], correctLabel: 'Đáp án đúng' }));
  assert.equal((why.match(/data-correct="true"/g) ?? []).length, 1);
  assert.match(why, /data-correct="true" class="[^"]*font-semibold[^"]*"><span[^>]*>B<\/span><span class="min-w-0 flex-1">Đúng vì khách đang chờ tại quầy\.<\/span>.*<span class="sr-only">Đáp án đúng<\/span>/);
  const quizSource = readFileSync(path.join(src, 'components/lesson/QuizContent.tsx'), 'utf8');
  assert.match(quizSource, /<QuizQuestion html=\{prob\.questionHtml\} \/>/);
  assert.match(quizSource, /<QuizExplanation html=\{fetchedExplanation \|\| prob\.explanationHtml \|\| ""\}\s+correctLetters=\{chosenOptionLetters\(prob, answers\[prob\.id\]\)\} correctLabel=\{t\("quiz\.correctOption"\)\} \/>/);
  for (const locale of ['vi', 'en']) assert.match(readFileSync(path.join(src, `i18n/locales/${locale}.ts`), 'utf8'), /correctOption: "/);
});

// ── Browser (DOM) part ──
let browser = null, page = null, unavailable = null;
before(async () => {
  try {
    const { chromium } = require(process.env.TEST_PLAYWRIGHT_MODULE || 'playwright');
    browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
    page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    const plainCompile = file => ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    await page.addScriptTag({ content: `{ const exports = {}; ${plainCompile(path.join(directory, 'problemParser.ts'))}; globalThis.lessonParser = exports; }` });
    await page.addScriptTag({ content: `{ const exports = {}; ${plainCompile(path.join(directory, 'quizText.ts'))}; globalThis.quizText = exports; }` });
  } catch (error) { unavailable = `browser unavailable: ${error.message.split('\n')[0]}`; }
});
after(async () => { await browser?.close(); });
const inBrowser = (name, run) => test(name, async context => { if (unavailable) { context.skip(unavailable); return; } await run(); });

inBrowser('OLX end to end: the AI ID stem keeps its line feeds; template whitespace between tags is not a line', async () => {
  const olx = `<problem>\n  <multiplechoiceresponse>\n    <label>${stem}</label>\n    <choicegroup type="MultipleChoice">\n      <choice>Kiểm kho</choice>\n      <choice>Đổi hàng</choice>\n    </choicegroup>\n  </multiplechoiceresponse>\n</problem>`;
  const result = await page.evaluate(xml => {
    const [problem] = globalThis.lessonParser.parseProblemHtml(xml);
    return { questionHtml: problem.questionHtml, plain: globalThis.quizText.plainQuizText(problem.questionHtml) };
  }, olx);
  assert.equal(result.questionHtml, `<label>${stem}</label>`);
  assert.equal(result.plain, stem);
});

test('rich HTML is shown as before: DOMPurify last, no line feed rewriting, nothing re-serialised after sanitizing', () => {
  const component = readFileSync(path.join(src, 'components/lesson/QuizText.tsx'), 'utf8');
  assert.equal((component.match(/plain\?\.trim\(\) \? "" : DOMPurify\.sanitize\(html\)/g) ?? []).length, 2, 'stem and explanation');
  assert.equal((component.match(/dangerouslySetInnerHTML=\{\{ __html: rich \}\}/g) ?? []).length, 2);
  assert.doesNotMatch(component, /LineBreaks|innerHTML|DOMParser|replace\(/, 'the sanitized string is used as it is');
  assert.equal(quiz.htmlWithTextLineBreaks, undefined);
  assert.match(component, /className="prose prose-sm prose-success dark:prose-invert max-w-none text-\[14px\] leading-relaxed text-foreground\/90"/,
    'a rich explanation keeps its old look');
  assert.match(component, /className="mb-8 whitespace-pre-wrap break-words text-\[17px\] md:text-\[19px\] font-bold leading-relaxed text-foreground \[&_br\]:block \[&_p\]:my-0"/,
    'a rich stem keeps its old whitespace handling, at the moderate size');
});
