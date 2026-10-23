#!/usr/bin/env node
// Render consumer-only standalone pages from the published SKILL.md source files.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const path = (name) => new URL(name, root);
const read = (name) => readFileSync(path(name), 'utf8');
const save = (name, content) => writeFileSync(path(name), `${content.replace(/[ \t]+$/gm, '').trimEnd()}\n`);
const skills = JSON.parse(read('skills/get-fable/registry.json')).skills;
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderBody(markdown) {
  const result = [];
  let code = false;
  let inList = false;
  for (const line of markdown.split('\n')) {
    if (line.trim().startsWith('```')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(code ? '</code></pre>' : '<pre><code>');
      code = !code;
      continue;
    }
    if (code) { result.push(`${escapeHtml(line)}\n`); continue; }
    if (/^\s*[-*] /.test(line)) {
      if (!inList) { result.push('<ul>'); inList = true; }
      result.push(`<li>${escapeHtml(line.trim().slice(2))}</li>`);
      continue;
    }
    if (inList) { result.push('</ul>'); inList = false; }
    if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      result.push(`<h${level}>${escapeHtml(line.slice(level).trim())}</h${level}>`);
    } else if (/^> /.test(line)) result.push(`<blockquote>${escapeHtml(line.slice(2))}</blockquote>`);
    else if (/^\s*\|/.test(line)) result.push(`<pre class="table-source">${escapeHtml(line)}</pre>`);
    else if (!line.trim()) result.push('');
    else result.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) result.push('</ul>');
  if (code) result.push('</code></pre>');
  return result.join('\n');
}

for (const skill of skills) {
  const source = read(`skills/${skill.id}/SKILL.md`);
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const body = match ? source.slice(match[0].length).trim() : source.trim();
  const url = `https://get-fable.vercel.app/skills/${skill.id}.html`;
  const sourceUrl = `https://github.com/imMamdouhaboammar/get-fable/blob/master/skills/${skill.id}/SKILL.md`;
  const markdown = `# ${skill.id}\n\n> ${skill.description}\n\n**Pack:** ${skill.pack} · **Phase:** ${skill.phase}\n\n[View the canonical Skill source](${sourceUrl})\n\n---\n\n${body}\n`;
  const json = {
    id: skill.id, pack: skill.pack, phase: skill.phase,
    description: skill.description, intents: skill.intents,
    requires: skill.requires, produces: skill.produces,
    gates: skill.gates, fallback: skill.fallback,
    next: skill.next, audience: 'consumer',
    canonical_url: url, source_url: sourceUrl, content_markdown: body,
    license: 'AGPL-3.0-or-later',
  };
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(skill.description)}">
<title>${skill.id} | get-fable Community Skill</title>
<link rel="canonical" href="${url}">
<link rel="alternate" type="text/markdown" href="../skills/${skill.id}.md">
<link rel="alternate" type="text/plain" href="../skills/${skill.id}.txt">
<link rel="alternate" type="application/json" href="../skills/${skill.id}.json">
<link rel="icon" href="../assets/mascot.svg" type="image/svg+xml">
<link rel="stylesheet" href="../styles.css"></head><body>
<header class="site-header"><a href="../index.html">get-fable</a> · <a href="../skills.html">Community Skills</a></header>
<main id="main-content" style="max-width:880px;margin:auto;padding:3rem 1.5rem;line-height:1.6;overflow-wrap:anywhere">
<div class="section-marker">${escapeHtml(skill.pack)} · ${escapeHtml(skill.phase)}</div>
<h1>${skill.id}</h1><p>${escapeHtml(skill.description)}</p>
<nav class="format-switcher" aria-label="Alternate formats">
<a href="../skills/${skill.id}.md">Markdown</a> · <a href="../skills/${skill.id}.txt">Plain text</a> · <a href="../skills/${skill.id}.json">JSON</a> · <a href="${sourceUrl}">Source</a>
</nav><article class="docs-body">${renderBody(body)}</article>
</main><footer style="text-align:center;padding:2rem">Public community Skill · AGPL-3.0-or-later</footer></body></html>\n`;
  for (const base of ['site/skills', 'public/skills']) {
    save(`${base}/${skill.id}.md`, markdown);
    save(`${base}/${skill.id}.txt`, `${skill.id}\n${skill.description}\n\n${body}\n`);
    save(`${base}/${skill.id}.json`, `${JSON.stringify(json, null, 2)}\n`);
    save(`${base}/${skill.id}.html`, html);
  }
}
console.log(`Rendered ${skills.length} public Skills in HTML, Markdown, text, and JSON.`);
