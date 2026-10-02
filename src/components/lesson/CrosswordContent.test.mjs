// Offline contract regression: execute production functions with isolated state.
// No server requests, credentials, provider calls or learner-progress writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const frontend = readFileSync(new URL('./CrosswordContent.tsx', import.meta.url), 'utf8');
const backendRoot = new URL('../../../../../landa-backend/src/modules/', import.meta.url);
const authoring = readFileSync(new URL('ai-chatbot/chat.service.ts', backendRoot), 'utf8');
const learner = readFileSync(new URL('learner/learner.service.ts', backendRoot), 'utf8');

function productionFunction(source, name, bindings = {}) {
  const ast = ts.createSourceFile('fixture.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) expression = node.initializer.getText(ast);
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) expression = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression, `Production function ${name} must exist`);
  const code = ts.transpileModule(`const extracted = (${expression});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${code}; return extracted;`)(...Object.values(bindings));
}

const normalize = productionFunction(authoring, 'normalizeCrosswordAnswer', {
  readString: (value, fallback, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : fallback,
});
const grade = productionFunction(learner, 'gradeCrossword', {
  submitFeedback: (code, params) => ({ code, params }),
});

function fixture(expected) {
  const state = { answers: {}, submissions: [], message: null };
  const words = expected.map((answer, index) => ({ id: index + 1, length: answer.length }));
  const input = productionFunction(frontend, 'handleCellChange', {
    words, setAnswers: update => { state.answers = update(state.answers); },
  });
  function submit() {
    productionFunction(frontend, 'handleSubmit', {
      words, answers: state.answers, t: key => key,
      setIsCorrect: value => { state.correct = value; },
      setResultMessage: value => { state.message = value; },
      submitMutation: { mutate: value => state.submissions.push(value) },
    })();
  }
  function result() {
    return grade({ metadata: { crossword_data: { words: expected.map((answer, i) => ({ id: i + 1, answer })) } } }, state.submissions.at(-1));
  }
  return { state, input, submit, result };
}

test('AI alphanumeric answer survives actual input, submit and exact backend grading', () => {
  const expected = ['ERA5.0', 'LOI HUA TOAN CAU', 'CAM KET'].map(normalize);
  assert.deepEqual(expected, ['ERA50', 'LOIHUATOANCAU', 'CAMKET']);
  const f = fixture(expected);
  expected.forEach((answer, index) => [...answer.toLowerCase()].forEach((char, cell) => f.input(index + 1, cell, char)));
  f.submit();
  assert.equal(f.state.submissions.length, 1);
  assert.deepEqual(f.state.submissions[0], { 1: 'ERA50', 2: 'LOIHUATOANCAU', 3: 'CAMKET' });
  assert.equal(f.result().status, 'correct');
  assert.equal(f.result().score, 100);
});

test('all ten digits remain enterable, including zero', () => {
  const f = fixture(['0123456789']);
  [...'0123456789'].forEach((char, i) => f.input(1, i, char));
  f.submit();
  assert.equal(f.result().status, 'correct');
});

test('legacy uppercase/lowercase letters and Vietnamese Đ keep their existing behavior', () => {
  const f = fixture(['ĐO', 'TERM']);
  [...'đo'].forEach((char, i) => f.input(1, i, char));
  [...'term'].forEach((char, i) => f.input(2, i, char));
  f.submit();
  assert.equal(f.result().status, 'correct');
});

test('deleting a cell blocks submission; replacing it restores completion without shifting cells', () => {
  const f = fixture(['ERA50']);
  [...'ERA50'].forEach((char, i) => f.input(1, i, char));
  f.input(1, 3, '');
  assert.equal(f.state.answers[1], 'ERA 0');
  f.submit();
  assert.equal(f.state.submissions.length, 0);
  assert.equal(f.state.message, 'crossword.completeAllCells');
  f.input(1, 3, '5');
  f.submit();
  assert.equal(f.result().status, 'correct');
});

test('punctuation cannot silently fill a required cell', () => {
  for (const char of ['.', '-', '<', ' ', '/']) {
    const f = fixture(['AB']);
    f.input(1, 0, 'A');
    f.input(1, 1, char);
    f.submit();
    assert.equal(f.state.submissions.length, 0);
  }
});

test('a fully entered incorrect answer is still graded incorrect', () => {
  const f = fixture(['ERA50']);
  [...'ERA51'].forEach((char, i) => f.input(1, i, char));
  f.submit();
  assert.equal(f.state.submissions.length, 1);
  assert.equal(f.result().status, 'incorrect');
  assert.equal(f.result().score, 0);
});
