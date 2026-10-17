/* global URL, Buffer */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// H7: completions send only what is not completed yet and fetch again only
// what a completion can change.
const source = readFileSync(new URL('./completionSync.logic.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  pendingCompletionIds, chunkIds, withCompletedBlocks, completionMilestones, refreshAfterCompletion,
  mergeRefreshScopes, MAX_BLOCK_IDS_PER_REQUEST,
} = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

// course → 2 chapters → lesson → unit → leaf blocks
function tree(completed = []) {
  const done = new Set(completed);
  const block = (id, type, children = []) => ({ id, type, display_name: id, children, completion: done.has(id) ? 1 : 0 });
  return {
    root: 'course',
    blocks: Object.fromEntries([
      block('course', 'course', ['ch1', 'ch2']),
      block('ch1', 'chapter', ['seq1']),
      block('seq1', 'sequential', ['unit1']),
      block('unit1', 'vertical', ['html1', 'video1', 'quiz1']),
      block('html1', 'html'), block('video1', 'video'), block('quiz1', 'problem'),
      block('ch2', 'chapter', ['seq2']),
      block('seq2', 'sequential', ['unit2']),
      block('unit2', 'vertical', ['faq2']),
      block('faq2', 'la_faq'),
    ].map((b) => [b.id, b])),
  };
}

test('only leaf blocks not completed yet are sent, each once; unknown ids are left to the server', () => {
  const t = tree(['html1']);
  assert.deepEqual(pendingCompletionIds(t, ['html1', 'video1', 'video1', 'seq1', 'unknown', '']), ['video1', 'unknown']);
  assert.deepEqual(pendingCompletionIds(t, ['html1', 'unit1']), [], 'revisiting a completed unit sends nothing');
  assert.deepEqual(pendingCompletionIds(undefined, ['a', 'a', 'b']), ['a', 'b'], 'no cached tree: the server decides');
});

test('requests carry at most the server limit of ids', () => {
  const ids = Array.from({ length: MAX_BLOCK_IDS_PER_REQUEST * 2 + 1 }, (_, i) => `b${i}`);
  assert.deepEqual(chunkIds(ids).map((chunk) => chunk.length), [200, 200, 1]);
  assert.deepEqual(chunkIds([]), []);
});

test('the cached tree marks the confirmed leaves, and stays the same object when nothing changes', () => {
  const before = tree(['html1']);
  const after = withCompletedBlocks(before, ['video1', 'seq1', 'html1', 'missing']);
  assert.equal(after.blocks.video1.completion, 1);
  assert.equal(after.blocks.seq1.completion, 0, 'structural blocks are not marked');
  assert.equal(before.blocks.video1.completion, 0, 'the previous tree is not changed');
  assert.equal(withCompletedBlocks(before, ['html1', 'seq1']), before);
});

test('milestones: a chapter or the whole course completed by this request', () => {
  const before = tree(['html1', 'video1']);
  const chapterDone = withCompletedBlocks(before, ['quiz1']);
  assert.deepEqual(completionMilestones(before, chapterDone), { completedModuleIds: ['ch1'], contentCompleted: false });
  const courseDone = withCompletedBlocks(chapterDone, ['faq2']);
  assert.deepEqual(completionMilestones(chapterDone, courseDone), { completedModuleIds: ['ch2'], contentCompleted: true });
  assert.deepEqual(completionMilestones(courseDone, courseDone), { completedModuleIds: [], contentCompleted: false });
});

const none = { completedModuleIds: [], contentCompleted: false };

test('an ordinary completion fetches nothing again: tree and progress come from the answer', () => {
  const out = refreshAfterCompletion({
    sentKnownLeaves: 1,
    results: [{ marked: 1, newly_completed: 1, progress: 40, is_completed: false, completion_changed: false }],
    milestones: none,
  });
  assert.deepEqual(out, { scope: {}, progress: 40, courseCompleted: false });
});

test('completing a chapter refreshes the course list; completing the course also the badges', () => {
  const chapter = refreshAfterCompletion({
    sentKnownLeaves: 1,
    results: [{ marked: 1, newly_completed: 1, progress: 75, is_completed: false, completion_changed: false }],
    milestones: { completedModuleIds: ['ch1'], contentCompleted: false },
  });
  assert.deepEqual(chapter.scope, { courseList: true });

  const course = refreshAfterCompletion({
    sentKnownLeaves: 1,
    results: [{ marked: 1, newly_completed: 1, progress: 100, is_completed: true, completion_changed: true }],
    milestones: { completedModuleIds: ['ch2'], contentCompleted: true },
  });
  assert.deepEqual(course.scope, { courseList: true, badges: true, assignments: true });
  assert.equal(course.progress, 100);
  assert.equal(course.courseCompleted, true);
});

test('blocks already completed on the server (another tab) only ask for the percentage', () => {
  const out = refreshAfterCompletion({ sentKnownLeaves: 2, results: [{ marked: 2, newly_completed: 0 }], milestones: none });
  assert.deepEqual(out.scope, { courseProgress: true });
  assert.equal(out.progress, null);
});

test('an older server answer ({ marked } only) or a refused block refreshes the tree', () => {
  assert.deepEqual(refreshAfterCompletion({ sentKnownLeaves: 1, results: [{ marked: 1 }], milestones: none }).scope,
    { courseProgress: true, courseBlocks: true });
  assert.deepEqual(
    refreshAfterCompletion({ sentKnownLeaves: 1, results: [{ marked: 1 }], milestones: { completedModuleIds: [], contentCompleted: true } }).scope,
    { courseProgress: true, courseBlocks: true, courseList: true, badges: true, assignments: true },
  );
  assert.equal(refreshAfterCompletion({
    sentKnownLeaves: 3,
    results: [{ marked: 2, newly_completed: 2, progress: 10, is_completed: false, completion_changed: false }],
    milestones: none,
  }).scope.courseBlocks, true);
});

test('scopes of a burst are merged', () => {
  assert.deepEqual(mergeRefreshScopes({ courseProgress: true }, { badges: true, courseList: false }), { courseProgress: true, badges: true });
});
