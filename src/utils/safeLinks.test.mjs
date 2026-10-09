/* global URL, Buffer */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// S2 T14: links in previewed Word/Excel files cannot run script.
const source = readFileSync(new URL('./safeLinks.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { isSafeLinkHref, neutralizeUnsafeLinks } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

const BASE = 'https://learn.example.com/library';

test('only http(s), mailto, relative links and anchors are safe', () => {
  for (const href of ['https://a.example/x', 'http://a.example', 'mailto:a@b.c', '#bookmark', 'other.docx', '', null]) {
    assert.equal(isSafeLinkHref(href, BASE), true, String(href));
  }
  for (const href of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'file:///c:/x']) {
    assert.equal(isSafeLinkHref(href, BASE), false, href);
  }
});

function element(tagName, attributes) {
  const attrs = new Map(Object.entries(attributes));
  return {
    tagName, attrs,
    getAttributeNames: () => [...attrs.keys()],
    getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
    removeAttribute: (name) => { attrs.delete(name); },
    setAttribute: (name, value) => { attrs.set(name, value); },
  };
}

test('unsafe links lose their target, handlers go, external links open safely', () => {
  const bad = element('A', { href: 'javascript:alert(document.cookie)' });
  const svg = element('a', { 'xlink:href': 'javascript:alert(1)' });
  const handler = element('SPAN', { onclick: 'steal()', class: 'x' });
  const good = element('A', { href: 'https://example.com/doc' });
  const anchor = element('A', { href: '#_Toc1' });
  const disabled = neutralizeUnsafeLinks({ querySelectorAll: () => [bad, svg, handler, good, anchor] }, BASE);
  assert.equal(disabled, 2);
  assert.equal(bad.attrs.has('href'), false);
  assert.equal(svg.attrs.has('xlink:href'), false);
  assert.deepEqual([...handler.attrs.keys()], ['class']);
  assert.equal(good.attrs.get('rel'), 'noopener noreferrer');
  assert.equal(good.attrs.get('target'), '_blank');
  assert.equal(anchor.attrs.get('href'), '#_Toc1');
  assert.equal(anchor.attrs.has('target'), false);
});
