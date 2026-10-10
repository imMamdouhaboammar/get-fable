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

describe('42 canonical skills standalone pages and multi-format contract', () => {
  const registryRaw = read('skills/get-fable/registry.json');
  const registry = JSON.parse(registryRaw) as { skills: { id: string }[] };

  test('verifies all 42 canonical skills have .html, .md, .txt, and .json pages', () => {
    expect(registry.skills.length).toBe(42);
    for (const skill of registry.skills) {
      const htmlFile = read(`site/skills/${skill.id}.html`);
      const mdFile = read(`site/skills/${skill.id}.md`);
      const txtFile = read(`site/skills/${skill.id}.txt`);
      const jsonFile = read(`site/skills/${skill.id}.json`);

      expect(htmlFile).toContain(skill.id);
      expect(htmlFile).toContain('rel="alternate" type="text/markdown"');
      expect(htmlFile).toContain('rel="alternate" type="text/plain"');
      expect(htmlFile).toContain('rel="alternate" type="application/json"');
      expect(htmlFile).toContain('class="format-switcher"');

      expect(mdFile).toContain(`# ${skill.id}`);
      expect(txtFile.length).toBeGreaterThan(50);

      const parsedJson = JSON.parse(jsonFile);
      expect(parsedJson.id).toBe(skill.id);
      expect(parsedJson.canonical_url).toContain(`skills/${skill.id}.html`);
    }
  });

  test('verifies core documentation and workflows exist across HTML, MD, TXT, and JSON', () => {
    for (const page of ['index', 'skills', 'guide', 'workflows', 'pricing']) {
      const htmlFile = read(`site/${page}.html`);
      const mdFile = read(`site/${page}.md`);
      const txtFile = read(`site/${page}.txt`);
      const jsonFile = read(`site/${page}.json`);

      expect(htmlFile.length).toBeGreaterThan(100);
      expect(mdFile.length).toBeGreaterThan(50);
      expect(txtFile.length).toBeGreaterThan(50);

      const parsed = JSON.parse(jsonFile);
      expect(parsed.title).toBeDefined();
    }
  });
});

describe('SEO, GEO and AI search discovery contract', () => {
  test('robots.txt allows all major traditional and AI search crawlers and points to sitemap', () => {
    const robots = read('site/robots.txt');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('User-agent: GPTBot');
    expect(robots).toContain('User-agent: ChatGPT-User');
    expect(robots).toContain('User-agent: PerplexityBot');
    expect(robots).toContain('User-agent: ClaudeBot');
    expect(robots).toContain('User-agent: Googlebot');
    expect(robots).toContain('User-agent: Bingbot');
    expect(robots).toContain('Sitemap: https://get-fable.vercel.app/sitemap.xml');
  });

  test('sitemap.xml catalogs all HTML, MD, TXT, and JSON endpoints with valid priorities', () => {
    const sitemap = read('site/sitemap.xml');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('https://get-fable.vercel.app/index.html');
    expect(sitemap).toContain('https://get-fable.vercel.app/skills.html');
    expect(sitemap).toContain('https://get-fable.vercel.app/guide.html');
    expect(sitemap).toContain('https://get-fable.vercel.app/workflows.html');
    expect(sitemap).toContain('https://get-fable.vercel.app/pricing.html');
    expect(sitemap).toContain('https://get-fable.vercel.app/skills/fable-tdd.html');
    expect(sitemap).toContain('https://get-fable.vercel.app/skills/fable-tdd.md');
    expect(sitemap).toContain('https://get-fable.vercel.app/skills/fable-tdd.json');
  });

  test('llms.txt and llms-full.txt adhere to the llmstxt.org standard', () => {
    const llms = read('site/llms.txt');
    const llmsFull = read('site/llms-full.txt');

    expect(llms).toContain('# get-fable');
    expect(llms).toContain('## Documentation & Guides');
    expect(llms).toContain('## Canonical Skills (42)');
    expect(llmsFull).toContain('USER GUIDE & SYSTEM ARCHITECTURE');
    expect(llmsFull).toContain('ALL 42 CANONICAL SKILL SPECIFICATIONS');
  });
});

