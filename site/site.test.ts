import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = import.meta.dir;
const repoRoot = join(root, '..');

const read = (path: string) => {
  const absolute = join(repoRoot, path);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
};

const html = read('site/index.html');
const css = read('site/styles.css');
const js = read('site/script.js');
const mascot = read('site/assets/mascot.svg');
const vercel = read('vercel.json');

describe('get-fable site structure', () => {
  test('ships a semantic landing page with the approved hero and navigation targets', () => {
    expect(html).toContain('<main');
    expect(html).toContain('<footer');
    expect(html).toContain('Your model is capable of more than the way you run it');
    expect(html).toContain('id="thesis"');
    expect(html).toContain('id="comparison"');
    expect(html).toContain('id="disciplines"');
    expect(html).toContain('id="workflow"');
    expect(html).toContain('id="quick-start"');
    expect(html).toContain('id="boundaries"');
  });

  test('uses only supported quick-start commands and deploy-safe repository links', () => {
    expect(html).toContain('git clone https://github.com/imMamdouhaboammar/get-fable.git');
    expect(html).toContain('bun ./bin/get-fable.js status');
    expect(html).toContain('bun ./bin/get-fable.js assets');
    expect(html).toContain('bun ./bin/get-fable.js install');
    expect(html).toContain('https://github.com/imMamdouhaboammar/get-fable');
    expect(html).toContain('https://github.com/imMamdouhaboammar/get-fable/blob/master/LICENSE');
    expect(html).toContain('https://github.com/imMamdouhaboammar/get-fable/blob/master/THIRD_PARTY_NOTICES.md');
  });

  test('keeps the public claim inside the documented trust boundary', () => {
    expect(html).toContain('does not change model weights');
    expect(html).toContain('independent community project');
    expect(html).not.toMatch(/turns?\s+(any|your|a)\s+model\s+into/i);
    expect(html).not.toMatch(/same intelligence/i);
    expect(html).not.toMatch(/zero hallucinations/i);
  });

  test('references local static assets and progressive enhancement', () => {
    expect(html).toContain('href="./styles.css"');
    expect(html).toContain('src="./script.js"');
    expect(html).toContain('src="./assets/mascot.svg"');
    expect(html).toContain('data-copy');
    expect(html).toContain('data-copy-status');
    expect(html).toContain('data-year');
  });
});

describe('editorial visual contract', () => {
  test('uses the existing mint accent and fluid editorial typography', () => {
    expect(css).toContain('#5BBF9B');
    expect(css).toContain('clamp(');
    expect(css).toContain(':focus-visible');
  });

  test('avoids the rejected AI-template treatments', () => {
    expect(css).not.toContain('linear-gradient');
    expect(css).not.toContain('radial-gradient');
    expect(css).not.toContain('backdrop-filter');
    expect(css).not.toMatch(/box-shadow\s*:[^;]*(0\s+0|glow)/i);
  });

  test('contains explicit mobile and reduced-motion handling', () => {
    expect(css).toMatch(/@media\s*\([^)]*max-width/i);
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('overflow-wrap');
  });
});

describe('progressive enhancement contract', () => {
  test('supports accessible copy feedback and reduced motion', () => {
    expect(js).toContain('navigator.clipboard');
    expect(js).toContain('Copied');
    expect(js).toContain('prefers-reduced-motion: reduce');
    expect(js).toContain('IntersectionObserver');
    expect(js).toContain('data-year');
  });
});

describe('deployment contract', () => {
  test('keeps a site-local copy of the existing rabbit mascot', () => {
    expect(mascot).toContain('get-fable Rabbit Mascot');
    expect(mascot).toContain('#5BBF9B');
  });

  test('publishes the site directory as a static Vercel output', () => {
    expect(vercel).toContain('"outputDirectory": "site"');
    expect(vercel).toContain('"framework": null');
  });
});
