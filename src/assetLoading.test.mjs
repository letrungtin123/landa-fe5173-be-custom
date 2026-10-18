/* global URL */
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const fontDir = new URL('../public/fonts/SF%20Pro%20Display_WOFF/', import.meta.url);

test('SF Pro Display: only the upright 400-900 faces are declared, shipped and swapped in', () => {
  const css = read('./index.css');
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1]);
  assert.equal(faces.length, 6);
  const weights = faces.map((face) => Number(/font-weight:\s*(\d+)/.exec(face)[1])).sort();
  assert.deepEqual(weights, [400, 500, 600, 700, 800, 900]);
  for (const face of faces) {
    assert.match(face, /font-style:\s*normal/);
    assert.match(face, /font-display:\s*swap/);
    const file = /url\('\/fonts\/SF%20Pro%20Display_WOFF\/([^']+)'\)/.exec(face)[1];
    assert.ok(existsSync(new URL(file, fontDir)), file);
  }
  const shipped = readdirSync(fontDir).sort();
  assert.equal(shipped.length, 6, shipped.join(', '));
  assert.ok(shipped.every((name) => !/Italic|Light|Thin|Ultralight/.test(name)));
});

test('the preloaded font files are the ones @font-face uses, only where SF Pro is used', () => {
  const html = read('../index.html');
  const css = read('./index.css');
  const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font" type="font\/woff"\s+crossorigin media="([^"]+)"/g)];
  assert.equal(preloads.length, 2);
  for (const [, href, media] of preloads) {
    assert.ok(css.includes(`url('${href}')`), href);
    assert.equal(media, '(max-width: 767px), (hover: none), (pointer: coarse)');
  }
});

test('celebration dialogs download one image per screen size', () => {
  const course = read('./components/lesson/Course100PercentModal.tsx');
  assert.doesNotMatch(course, /hidden md:block absolute inset-0/);
  assert.match(course, /<picture>\s*<source media="\(min-width: 768px\)" srcSet=\{CompleteBGModalPC\} \/>\s*<img src=\{CompleteBGModalMobile\}/);
  const section = read('./components/lesson/SectionCompleteModal.tsx');
  assert.match(section, /<source media="\(min-width: 768px\)" srcSet=\{letterUrl\} \/>/);
  assert.match(section, /<source media="\(min-width: 768px\)" srcSet=\{flyElementUrl\} \/>/);
  assert.doesNotMatch(section, /section-complete-(letter|fly-element)-mobile/);
  // The style block switches at the same width as the <picture> sources.
  assert.match(section, /@media \(max-width: 767px\)/);
});

test('lesson HTML images and list thumbnails load lazily', () => {
  assert.match(read('./components/lesson/HtmlBlockContent.tsx'), /img\.setAttribute\("loading", "lazy"\)/);
  for (const file of ['./pages/ExplorePage.tsx', './pages/CoursesPage.tsx', './pages/LibraryPage.tsx']) {
    assert.match(read(file), /<img loading="lazy" decoding="async"/, file);
  }
});
