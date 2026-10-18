/* global URL */
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

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
    // WOFF2 first, the WOFF of the same face as fallback.
    const sources = [...face.matchAll(/url\('\/fonts\/SF%20Pro%20Display_WOFF\/([^']+)'\) format\('([^']+)'\)/g)].map((m) => [m[1], m[2]]);
    assert.equal(sources.length, 2, face);
    assert.equal(sources[0][1], 'woff2');
    assert.equal(sources[1][1], 'woff');
    assert.equal(sources[0][0].replace(/\.woff2$/, ''), sources[1][0].replace(/\.woff$/, ''));
    for (const [file] of sources) assert.ok(existsSync(new URL(file, fontDir)), file);
  }
  const shipped = readdirSync(fontDir).sort();
  assert.equal(shipped.length, 12, shipped.join(', '));
  assert.ok(shipped.every((name) => !/Italic|Light|Thin|Ultralight/.test(name)));
  for (const woff2 of shipped.filter((name) => name.endsWith('.woff2'))) {
    const woff = woff2.replace(/\.woff2$/, '.woff');
    assert.ok(statSync(new URL(woff2, fontDir)).size < statSync(new URL(woff, fontDir)).size * 0.8, woff2);
    assert.equal(readFileSync(new URL(woff2, fontDir)).subarray(0, 4).toString('latin1'), 'wOF2', woff2);
  }
});

test('the preloaded font files are the ones @font-face uses, only where SF Pro is used', () => {
  const html = read('../index.html');
  const css = read('./index.css');
  const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font" type="font\/woff2"\s+crossorigin media="([^"]+)"/g)];
  // Semibold only: the phone sign-in page uses no other face, a Bold preload added 1.5 MB there.
  assert.deepEqual(preloads.map(([, href]) => href), ['/fonts/SF%20Pro%20Display_WOFF/SF-Pro-Display-Semibold.woff2']);
  for (const [, href, media] of preloads) {
    assert.ok(css.includes(`url('${href}')`), href);
    assert.equal(media, '(max-width: 767px), (hover: none), (pointer: coarse)');
  }
});

test('celebration dialogs download one image per screen size', () => {
  const course = read('./components/lesson/Course100PercentModal.tsx');
  assert.doesNotMatch(course, /hidden md:block absolute inset-0/);
  // WebP first for each size, the PNG as fallback, the mobile PNG as <img>.
  assert.match(course, /<picture>\s*<source media="\(min-width: 768px\)" type="image\/webp" srcSet=\{CompleteBGModalPCWebp\} \/>\s*<source media="\(min-width: 768px\)" srcSet=\{CompleteBGModalPC\} \/>\s*<source type="image\/webp" srcSet=\{CompleteBGModalMobileWebp\} \/>\s*<img src=\{CompleteBGModalMobile\}/);
  for (const icon of ['Trophy', 'Hat', 'Pencil']) {
    assert.equal(course.match(new RegExp(`webp=\\{CompleteModal${icon}Webp\\} src=\\{CompleteModal${icon}\\}`, 'g'))?.length, 2, icon);
  }
  const section = read('./components/lesson/SectionCompleteModal.tsx');
  for (const [webp, png, mobileWebp] of [['letterWebpUrl', 'letterUrl', 'letterElementMobileWebpUrl'], ['flyElementWebpUrl', 'flyElementUrl', 'flyElementMobileWebpUrl']]) {
    assert.match(section, new RegExp(`<source media="\\(min-width: 768px\\)" type="image/webp" srcSet=\\{${webp}\\} />\\s*<source media="\\(min-width: 768px\\)" srcSet=\\{${png}\\} />\\s*<source type="image/webp" srcSet=\\{${mobileWebp}\\} />`));
  }
  assert.match(section, /webp=\{lightEffectWebpUrl\}/);
  assert.match(read('./components/lesson/CompleteCourseModal.tsx'), /webp=\{ConfirmPictureWebp\}/);
  assert.doesNotMatch(section, /section-complete-(letter|fly-element)-mobile/);
  // The style block switches at the same width as the <picture> sources.
  assert.match(section, /@media \(max-width: 767px\)/);
  // The wrapper takes no layout box, so the <img> classes behave as before.
  assert.match(read('./components/lesson/WebpImage.tsx'), /<picture className="contents">/);
});

test('every celebration WebP sits next to its PNG and is much smaller', () => {
  const assets = new URL('./assets/', import.meta.url);
  for (const name of ['CompleteCourseModal/CompleteBGModalPC', 'CompleteCourseModal/CompleteBGModalMobile', 'CompleteCourseModal/CompleteModalHat',
    'CompleteCourseModal/CompleteModalPencil', 'CompleteCourseModal/CompleteModalTrophy', 'CompleteCourseModal/ConfirmPicture',
    'EncourageModal/Fly_element', 'EncourageModal/fly-element-mobile', 'EncourageModal/letter', 'EncourageModal/letter-element-mobile', 'EncourageModal/light-effect']) {
    const png = statSync(new URL(`${name}.png`, assets)).size;
    const webp = statSync(new URL(`${name}.webp`, assets)).size;
    assert.ok(webp < png / 2, `${name}: ${webp} vs ${png}`);
  }
});

test('lesson HTML images and list thumbnails load lazily', () => {
  assert.match(read('./components/lesson/HtmlBlockContent.tsx'), /img\.setAttribute\("loading", "lazy"\)/);
  for (const file of ['./pages/ExplorePage.tsx', './pages/CoursesPage.tsx', './pages/LibraryPage.tsx']) {
    assert.match(read(file), /<img loading="lazy" decoding="async"/, file);
  }
});
