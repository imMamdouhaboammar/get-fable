#!/usr/bin/env node
// Public static mirrors deliberately summarize released docs, never internal drafts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const file = (name) => new URL(name, root);
const read = (name) => readFileSync(file(name), 'utf8');
const save = (name, value) => writeFileSync(file(name), `${value.replace(/[ \t]+$/gm, '').trimEnd()}\n`);
const count = JSON.parse(read('site/skills.json')).totalSkills;
const version = JSON.parse(read('package.json')).version;

const content = {
  docs: {
    title: 'Get-fable documentation',
    summary: 'Install the community Skills, set up the published CLI, and verify your coding-agent environment.',
    sections: [
      ['Get the public Skills', 'npx skills add imMamdouhaboammar/get-fable'],
      ['Install the CLI', 'bun add -g get-fable'],
      ['Initialize your project', 'get-fable init\nget-fable install all\nget-fable skills install all'],
      ['Check the setup', 'get-fable --version\nget-fable doctor --json-v1\nget-fable lint'],
    ],
  },
  guide: {
    title: 'A practical get-fable guide',
    summary: 'Make engineering tasks explicit: discover, plan, test, implement, verify, review, and hand off.',
    sections: [
      ['Start with Skills', 'npx skills add imMamdouhaboammar/get-fable'],
      ['Set up a repository', 'bun add -g get-fable\nget-fable init\nget-fable install all\nget-fable skills install all'],
      ['Check real state', 'get-fable status --json-v1\nget-fable doctor --json-v1\nget-fable route "inspect this repository"'],
    ],
  },
  workflows: {
    title: 'Practical get-fable workflows',
    summary: 'Small examples for a disciplined coding loop, with commands that work from a published CLI installation.',
    sections: [
      ['Install public Skills', 'npx skills add imMamdouhaboammar/get-fable'],
      ['Initialize and inspect', 'bun add -g get-fable\nget-fable init\nget-fable status --json-v1'],
      ['Route a task', 'get-fable route "investigate the failing test before editing"'],
      ['Verify your environment', 'get-fable doctor --json-v1\nget-fable lint'],
    ],
  },
  pricing: {
    title: 'Community Skills and Pro MCP',
    summary: 'The community Skills are fully open source under AGPL-3.0-or-later. A separate premium MCP harness is in development.',
    sections: [
      ['Available now: open-source community Skills', 'npx skills add imMamdouhaboammar/get-fable'],
      ['Optional published CLI', 'bun add -g get-fable'],
      ['Get-Fable Pro MCP', 'In development. No published availability, pricing, or performance claims yet.'],
    ],
  },
  prompts: {
    title: 'Ask your agent to configure get-fable',
    summary: 'A safe setup prompt that follows the installation playbook and checks the result.',
    sections: [
      ['Start with public Skills', 'npx skills add imMamdouhaboammar/get-fable'],
      ['Initialize after environment review', 'bun add -g get-fable\nget-fable init\nget-fable install all\nget-fable skills install all'],
      ['Verify', 'get-fable doctor --json-v1\nget-fable lint'],
    ],
  },
};

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

for (const [page, item] of Object.entries(content)) {
  const markdown = [
    `# ${item.title}`,
    '',
    item.summary,
    '',
    `Current public source: ${count} community Skills across 8 packs. CLI package manifest: ${version}.`,
    '',
  ];
  for (const [title, command] of item.sections) {
    markdown.push(`## ${title}`, '', '```bash', command, '```', '');
  }
  markdown.push(
    'For details, read the [installation guide](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/INSTALLATION.md),',
    '[agent onboarding playbook](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/install-and-init-get-fable.md),',
    'and [community catalog](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/CANONICAL_SKILLS.md).',
    '',
    'The Skills are open source. Get-Fable Pro MCP is in development and is not required for community use.',
    ''
  );
  const md = `${markdown.join('\n')}\n`;
  const plain = md.replace(/```bash\n([\s\S]*?)```/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const json = {
    title: item.title, summary: item.summary, version,
    publicSkills: count, supportedHosts: 32,
    sections: item.sections.map(([title, command]) => ({ title, command })),
    source: `https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/${page === 'docs' ? 'INSTALLATION.md' : 'install-and-init-get-fable.md'}`,
  };
  const sections = item.sections.map(([title, command]) =>
    `<section><h2>${escapeHtml(title)}</h2><pre><code>${escapeHtml(command)}</code></pre></section>`
  ).join('\n');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(item.summary)}"><title>${escapeHtml(item.title)} | get-fable</title>
<link rel="canonical" href="https://get-fable.vercel.app/${page}.html">
<link rel="alternate" type="text/markdown" href="./${page}.md">
<link rel="alternate" type="text/plain" href="./${page}.txt">
<link rel="alternate" type="application/json" href="./${page}.json">
<link rel="icon" type="image/svg+xml" href="./assets/mascot.svg"><link rel="stylesheet" href="./styles.css"></head>
<body><header class="site-header"><a href="./index.html">get-fable</a> · <a href="./skills.html">${count} public Skills</a> · <a href="./docs.html">Docs</a></header>
<main id="main-content" style="max-width:850px;margin:auto;padding:4rem 1.5rem;line-height:1.6">
<p>Community / AGPL-3.0-or-later</p><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.summary)}</p>
<p>${count} public community Skills across 8 packs. Integration adapters target 32 hosts with varying levels of support.</p>
${sections}
<p><a href="https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/INSTALLATION.md">Full installation guide</a> ·
<a href="https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/AGENT_SETUP_PROMPT.md">Ask your agent to install</a> ·
<a href="https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/CANONICAL_SKILLS.md">Public catalog</a></p>
<p>Community Skills are open source. Get-Fable Pro MCP is in development, not a released product.</p></main>
<footer style="padding:2rem;text-align:center">Independent open-source engineering project · <a href="https://github.com/imMamdouhaboammar/get-fable">GitHub</a></footer></body></html>\n`;
  for (const base of ['site', 'public']) {
    if (existsSync(file(`${base}/${page}.html`))) save(`${base}/${page}.html`, html);
  }
  if (existsSync(file(`site/${page}.md`))) save(`site/${page}.md`, md);
  if (existsSync(file(`site/${page}.txt`))) save(`site/${page}.txt`, plain);
  if (existsSync(file(`site/${page}.json`))) save(`site/${page}.json`, `${JSON.stringify(json, null, 2)}\n`);
}
console.log(`Refreshed public docs/guide mirrors for ${count} Skills.`);
