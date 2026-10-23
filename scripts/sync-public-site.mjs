#!/usr/bin/env node
// Regenerate public-facing Skill indexes from the on-disk consumer registry.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const file = (name) => new URL(name, root);
const read = (name) => readFileSync(file(name), 'utf8');
const save = (name, value) => writeFileSync(file(name), `${value.replace(/[ \t]+$/gm, '').trimEnd()}\n`);
const registry = JSON.parse(read('skills/get-fable/registry.json'));
const skills = registry.skills;
const ids = new Set(skills.map((skill) => skill.id));
const packs = JSON.parse(read('site/skills.json')).packs;

const catalog = [
  '# Public Community Skills',
  '',
  `**${skills.length} installable Skills across ${packs.length} packs.** Generated from the public consumer registry.`,
  '',
  'Install with `npx skills add imMamdouhaboammar/get-fable`.',
  '',
];
for (const pack of packs) {
  if (!pack.skills.length) continue;
  catalog.push(`## ${pack.name} (${pack.skills.length})`, '', pack.description, '');
  for (const id of pack.skills) {
    const skill = skills.find((item) => item.id === id);
    if (!skill) throw new Error(`Missing catalog Skill ${id}`);
    catalog.push(`- [\`${id}\`](../skills/${id}/SKILL.md): ${skill.description}`);
  }
  catalog.push('');
}
save('docs/CANONICAL_SKILLS.md', `${catalog.join('\n')}\n`);
save('site/skills.md', `${catalog.join('\n').replaceAll('../skills/', './skills/').replaceAll('/SKILL.md', '.md')}\n`);
save('site/skills.txt', `${catalog.join('\n').replace(/\[(`[^`]+`)\]\([^)]*\)/g, '$1')}\n`);

for (const name of ['site/skills.html', 'public/skills.html']) {
  let html = read(name);
  html = html.replace(/<article class="skill-card"[\s\S]*?<\/article>/g, (block) => {
    const match = block.match(/href="\.\/skills\/([a-z][a-z0-9-]+)\.html"/);
    return !match || ids.has(match[1]) ? block : '';
  });
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (tag, data) => {
    try {
      const json = JSON.parse(data);
      if (json['@type'] !== 'ItemList' || !Array.isArray(json.itemListElement)) return tag;
      json.itemListElement = json.itemListElement
        .filter((item) => ids.has(item.name))
        .map((item, index) => ({ ...item, position: index + 1 }));
      json.numberOfItems = json.itemListElement.length;
      return `<script type="application/ld+json">\n${JSON.stringify(json, null, 2)}\n  </script>`;
    } catch {
      throw new Error(`Invalid ItemList JSON-LD in ${name}`);
    }
  });
  html = html.replace(/\b(?:42|44|46) (?:[Cc]anonical )?[Ss]kills\b/g, `${skills.length} public Skills`);
  html = html.replace(/\b(?:42|44|46) [Cc]anonical [Ss]kills [Cc]atalog\b/g, `${skills.length} Public Skills Catalog`);
  html = html.replace(/\b(?:42|44|46) canonical get-fable skills\b/g, `${skills.length} public get-fable Skills`);
  html = html.replace(/Skills \((?:42|44|46)\)/g, `Skills (${skills.length})`);
  html = html.replace(/All \((?:42|44|46)\)/g, `All (${skills.length})`);
  save(name, html);
}

for (const name of ['site/sitemap.xml', 'public/sitemap.xml']) {
  let xml = read(name);
  xml = xml.replace(/\s*<url>[\s\S]*?<\/url>/g, (block) => {
    const match = block.match(/\/skills\/([a-z][a-z0-9-]+)\.(?:html|md|txt|json)/);
    return match && !ids.has(match[1]) ? '' : block;
  });
  save(name, xml);
}

const lines = [
  '# get-fable',
  '',
  '> Public community Skills and an optional coding lifecycle CLI for AI coding agents.',
  '',
  '## Documentation & Guides',
  '- [Installation](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/INSTALLATION.md)',
  '- [Agent setup prompt](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/AGENT_SETUP_PROMPT.md)',
  '- [Usage](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/USAGE.md)',
  '',
  `## Canonical Skills (${skills.length})`,
  ...skills.map((skill) => `- [${skill.id}](https://get-fable.vercel.app/skills/${skill.id}.html): ${skill.description}`),
  '',
];
const small = `${lines.join('\n')}\n`;
const full = [
  '# get-fable: PUBLIC SKILL INDEX',
  '',
  `## ALL ${skills.length} PUBLIC SKILL SPECIFICATIONS`,
  '',
  'Read the linked public playbooks. CLI installation is a separate npm package.',
  '',
  ...lines.slice(lines.indexOf(`## Canonical Skills (${skills.length})`) + 1),
].join('\n');
for (const name of ['llms.txt', 'site/llms.txt', 'public/llms.txt']) save(name, small);
for (const name of ['llms-full.txt', 'site/llms-full.txt', 'public/llms-full.txt']) save(name, `${full}\n`);

console.log(`Refreshed public skill indexes and sitemaps for ${skills.length} Skills.`);
