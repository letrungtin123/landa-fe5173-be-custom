/* global URL */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// After F5 on /badges the badges stayed invisible: BadgeRoute shows a loader
// until the tenant context is ready, then renders the lazy page. That page
// suspended to the app-level Suspense, which hid the layout that was already
// shown, and the page transition never became visible again. A route that
// waits for the tenant context must render its lazy page inside its own
// Suspense (as NewsRoute does).
const file = new URL('./App.tsx', import.meta.url);
const sourceFile = ts.createSourceFile('App.tsx', readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);

function isLazyCall(node) {
  if (!node || !ts.isCallExpression(node)) return false;
  const callee = node.expression;
  return (ts.isIdentifier(callee) && callee.text === 'lazy')
    || (ts.isPropertyAccessExpression(callee) && callee.name.text === 'lazy');
}

const lazyComponents = new Set();
const gatedRoutes = [];
ts.forEachChild(sourceFile, function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isLazyCall(node.initializer)) lazyComponents.add(node.name.text);
  if (ts.isFunctionDeclaration(node) && node.name && node.body?.getText(sourceFile).includes('tenantContextReady')) gatedRoutes.push(node);
  ts.forEachChild(node, visit);
});

function tagName(node) {
  return node.tagName.getText(sourceFile);
}

function lazyElementsOutsideSuspense(fn) {
  const found = [];
  (function visit(node, insideSuspense) {
    if (ts.isJsxElement(node) && tagName(node.openingElement) === 'Suspense') insideSuspense = true;
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && lazyComponents.has(tagName(node)) && !insideSuspense) {
      found.push(tagName(node));
    }
    ts.forEachChild(node, (child) => visit(child, insideSuspense));
  })(fn.body, false);
  return found;
}

test('the routes that wait for the tenant context are found', () => {
  assert.ok(lazyComponents.has('BadgesPage') && lazyComponents.has('NewsPage'));
  const names = gatedRoutes.map((fn) => fn.name.text);
  assert.ok(names.includes('BadgeRoute') && names.includes('NewsRoute'), names.join(', '));
});

test('a route that waits for the tenant context renders its lazy page inside its own Suspense', () => {
  for (const fn of gatedRoutes) {
    assert.deepEqual(lazyElementsOutsideSuspense(fn), [], `${fn.name.text} renders a lazy page outside its own Suspense`);
  }
});

test('the lazy chat widget renders inside its own Suspense, never the app-level one', () => {
  assert.ok(lazyComponents.has('ChatWidget'), 'ChatWidget is a lazy chunk');
  let protectedRoute = null;
  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'ProtectedRoute') protectedRoute = node;
    ts.forEachChild(node, visit);
  });
  assert.ok(protectedRoute, 'ProtectedRoute found');
  assert.deepEqual(lazyElementsOutsideSuspense(protectedRoute), []);
  assert.doesNotMatch(readFileSync(file, 'utf8'), /import ChatWidget from/);
});

test('lesson diagrams, end-of-course dialogs and the English strings load on demand, each with its own boundary', () => {
  const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
  const lesson = read('./pages/LessonDetailPage.tsx');
  assert.match(lesson, /const DiagramContent = lazy\(\(\) => import\("@\/components\/lesson\/DiagramContent"\)\)/);
  assert.match(lesson, /<Suspense fallback=\{[^}]*min-h-\[500px\][^}]*\}>\s*<DiagramContent data=\{comp\.diagramData\} \/>\s*<\/Suspense>/);
  const courseLayout = read('./components/layout/CourseLayout.tsx');
  assert.doesNotMatch(courseLayout, /import \{ (CompleteCourseModal|Course100PercentModal) \}/);
  assert.match(courseLayout, /<Suspense fallback=\{null\}>\s*<CompleteCourseModal/);
  const i18n = read('./i18n/index.ts');
  assert.doesNotMatch(i18n, /import \{ en \}/);
  assert.match(i18n, /import\("\.\/locales\/en"\)/);
  assert.match(read('./main.tsx'), /changeAppLocale\(useLocaleStore\.getState\(\)\.locale\)\.finally\(/);
  assert.match(read('./components/providers/LocaleProvider.tsx'), /void changeAppLocale\(locale\)/);
});
