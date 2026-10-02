// Offline browser-DOM tests. No app/API navigation, credentials or DB access.
// Use an existing Playwright installation via TEST_PLAYWRIGHT_MODULE if it is
// not locally installed; TEST_BROWSER_CHANNEL may select an installed browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, after, test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.TEST_PLAYWRIGHT_MODULE || 'playwright');
const parserSource = readFileSync(new URL('./problemParser.ts', import.meta.url), 'utf8');
const quizSource = readFileSync(new URL('../components/lesson/QuizContent.tsx', import.meta.url), 'utf8');
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let browser, page;
before(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
  page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  await page.addScriptTag({ content: `{ const exports = {}; ${compile(parserSource)}; globalThis.lessonParser = exports; }` });
});
after(async () => { await browser?.close(); });
const parse = xml => page.evaluate(xml => globalThis.lessonParser.parseProblemHtml(xml), xml);
const choices = '<choicegroup><choice correct="true">Choice A</choice><choice correct="false">Choice B</choice></choicegroup>';
const mcq = stem => `<multiplechoiceresponse><label>${stem}</label>${choices}</multiplechoiceresponse>`;

for (const [tag, input, type, id] of [
  ['multiplechoiceresponse', choices, 'single-select', 'olx_mcq_0'],
  ['choiceresponse', choices.replaceAll('choicegroup', 'checkboxgroup'), 'multi-select', 'olx_multi_0'],
  ['optionresponse', '<optioninput><option correct="true">A</option><option correct="false">B</option></optioninput>', 'dropdown', 'olx_dropdown_0'],
  ['stringresponse', '<textline/>', 'text-input', 'olx_text_0'],
  ['numericalresponse', '<responseparam type="tolerance" default="0.1"/><textline/>', 'text-input', 'olx_num_0'],
]) {
  test(`${tag}: nested label is visible without changing submission identity`, async () => {
    const [problem] = await parse(`<problem><${tag} answer="42"><label>What is the <b>correct</b> sequence?</label>${input}</${tag}></problem>`);
    assert.equal(problem.type, type);
    assert.equal(problem.id, id);
    assert.equal(problem.questionHtml, '<label>What is the <b>correct</b> sequence?</label>');
    if (tag === 'multiplechoiceresponse') {
      assert.deepEqual(problem.options.map(o => o.id), ['choice_0', 'choice_1']);
      assert.equal(problem.correctAnswerHtml, 'Choice A');
    }
    if (tag === 'stringresponse' || tag === 'numericalresponse') assert.equal(problem.correctAnswerHtml, '42');
  });
}

test('Executive UAT shape: VI stem inside response survives alongside four options', async () => {
  const question = 'Theo dòng chảy chuyển hóa năng lực lãnh đạo, thứ tự đúng từ Mindset đến Business Value là gì?';
  const options = ['MINDSET → AMBITION → STRATEGY → CAPABILITY → ACTION → BUSINESS VALUE', 'B', 'C', 'D'];
  const [problem] = await parse(`<problem><multiplechoiceresponse><label>${question}</label><choicegroup type="MultipleChoice">${options.map((s, i) => `<choice correct="${i === 0}">${s}</choice>`).join('')}</choicegroup></multiplechoiceresponse></problem>`);
  assert.equal(problem.questionHtml, `<label>${question}</label>`);
  assert.equal(problem.options.length, 4);
  assert.equal(problem.options[0].text, options[0]);
});

test('legacy preceding stem and local introduction retain rich text without duplication', async () => {
  const [problem] = await parse(`<problem><p>Shared <em>context</em>.</p>${mcq('Local question?')}</problem>`);
  assert.equal(problem.questionHtml, '<p>Shared <em>context</em>.</p><label>Local question?</label>');
  const [legacy] = await parse(`<problem><p>Legacy question?</p><multiplechoiceresponse>${choices}</multiplechoiceresponse></problem>`);
  assert.equal(legacy.questionHtml, '<p>Legacy question?</p>');
});

test('multiple responses own distinct stems and never inherit previous choices or question', async () => {
  const problems = await parse(`<problem><p>First intro</p>${mcq('First?')}<solution>PRIVATE_SOLUTION</solution><p>Second intro</p>${mcq('Second?')}<multiplechoiceresponse>${choices}</multiplechoiceresponse></problem>`);
  assert.equal(problems[0].questionHtml, '<p>First intro</p><label>First?</label>');
  assert.equal(problems[1].questionHtml, '<p>Second intro</p><label>Second?</label>');
  assert.equal(problems[2].questionHtml, 'Chọn đáp án đúng:');
  assert.deepEqual(problems.map(p => p.id), ['olx_mcq_0', 'olx_mcq_1', 'olx_mcq_2']);
});

test('preceding response inside wrapper cannot leak another question', async () => {
  const problems = await parse(`<problem><div>${mcq('First?')}</div>${mcq('Second?')}</problem>`);
  assert.equal(problems[1].questionHtml, '<label>Second?</label>');
});

test('escaped text stays text; solution/hints/input configuration stay outside the stem', async () => {
  const [problem] = await parse(`<problem><stringresponse answer="SECRET">Is x &lt; 5 &amp; y &gt; 2?<textline/><solution>SOLUTION</solution></stringresponse><demandhint><hint>HINT</hint></demandhint></problem>`);
  assert.equal(problem.questionHtml, 'Is x &lt; 5 &amp; y &gt; 2?');
  assert.doesNotMatch(problem.questionHtml, /SECRET|SOLUTION|HINT/);
  assert.equal(problem.hintHtml, 'HINT');
});

test('script/style are not included and learner still sanitizes displayed rich HTML', async () => {
  const [problem] = await parse(`<problem><script>PRIVATE_SCRIPT</script><style>PRIVATE_STYLE</style>${mcq('Question?')}</problem>`);
  assert.equal(problem.questionHtml, '<label>Question?</label>');
  assert.match(quizSource, /DOMPurify\.sanitize\(prob\.questionHtml\)/);
});

test('legacy rendered edX HTML branch retains input names and stem', async () => {
  const [problem] = await parse('<div class="problem"><div class="wrapper-problem-response"><p>Rendered question?</p><div class="choicegroup"><input type="radio" id="a" name="input_1" value="choice_0"><label for="a">A</label></div></div></div>');
  assert.equal(problem.id, 'input_1');
  assert.equal(problem.questionHtml, '<p>Rendered question?</p>');
  assert.equal(problem.options[0].text, 'A');
});

test('fingerprint invalidates old cache, question-only, option-ID and response-ID changes', async () => {
  const results = await page.evaluate(xml => {
    const { parseProblemHtml, problemContentFingerprint: fp } = globalThis.lessonParser;
    const problems = parseProblemHtml(xml);
    const before = fp(problems);
    const legacy = JSON.stringify(problems.map(p => p.type + '|' + p.options.map(o => `${o.text}|${o.html || ''}`).join(',')));
    const change = mutate => { const copy = structuredClone(problems); mutate(copy[0]); return fp(copy); };
    return { before, same: fp(structuredClone(problems)), legacy,
      question: change(p => p.questionHtml = 'Changed stem'),
      option: change(p => p.options[0].id = 'changed'), id: change(p => p.id = 'changed') };
  }, `<problem>${mcq('Question?')}</problem>`);
  assert.equal(results.before, results.same);
  for (const key of ['legacy', 'question', 'option', 'id']) assert.notEqual(results.before, results[key]);
  assert.match(quizSource, /const currentFingerprint = problemContentFingerprint\(problems\)/);
  assert.match(quizSource, /const fp = problemContentFingerprint\(parsedProblems\)/);
  assert.doesNotMatch(quizSource, /setParsedProblems\(cached\.parsedProblems/);
});

// Execute the actual component's parsing/cache effect with isolated state/store
// bindings. This is not a duplicate cache algorithm or an authenticated UAT.
const ast = ts.createSourceFile('QuizContent.tsx', quizSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effectSource;
function findEffect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
    && node.arguments[0]?.getText(ast).includes('parseProblemHtml(quizHtml)')) effectSource = node.arguments[0].getText(ast);
  ts.forEachChild(node, findEffect);
}
findEffect(ast);
assert.ok(effectSource, 'Production parsing/cache effect must be exercised');
const effectJs = compile(`const run = ${effectSource};`);
for (const cacheKind of ['old', 'same', 'changed-question']) {
  test(`production effect: ${cacheKind} cache cannot replace current question`, async () => {
    const state = await page.evaluate(({ code, xml, cacheKind }) => {
      const { parseProblemHtml, problemContentFingerprint } = globalThis.lessonParser;
      const problems = parseProblemHtml(xml);
      const cachedProblems = structuredClone(problems);
      cachedProblems[0].questionHtml = 'STALE_STEM';
      const cached = { parsedProblems: cachedProblems, resultMessage: 'Saved success', isCorrect: true, answers: { olx_mcq_0: 'choice_0' },
        contentFingerprint: cacheKind === 'same' ? problemContentFingerprint(problems)
          : cacheKind === 'changed-question' ? problemContentFingerprint(cachedProblems) : 'legacy-fingerprint' };
      const state = { cleared: false };
      const bindings = { quizHtml: xml, problemUsageKey: 'fixture', parseProblemHtml, problemContentFingerprint,
        useBlockSubmitStore: { getState: () => ({ getResult: () => cached, setResult: () => { state.cleared = true; } }) } };
      for (const key of ['ParsedProblems', 'ResultMessage', 'IsCorrect', 'Answers', 'FetchedExplanation', 'ShowHint', 'IsLoadingContent']) {
        bindings[`set${key}`] = value => { state[key] = value; };
      }
      new Function(...Object.keys(bindings), `${code}; run();`)(...Object.values(bindings));
      return state;
    }, { code: effectJs, xml: `<problem>${mcq('Current question?')}</problem>`, cacheKind });
    assert.equal(state.ParsedProblems[0].questionHtml, '<label>Current question?</label>');
    assert.equal(state.IsLoadingContent, false);
    assert.equal(state.cleared, cacheKind !== 'same');
    assert.equal(state.ResultMessage, cacheKind === 'same' ? 'Saved success' : null);
  });
}
