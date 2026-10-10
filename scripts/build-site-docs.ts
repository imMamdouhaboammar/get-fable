import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dir, '..');
const siteDir = path.join(repoRoot, 'site');
const skillsDir = path.join(siteDir, 'skills');

if (!fs.existsSync(skillsDir)) {
  fs.mkdirSync(skillsDir, { recursive: true });
}

interface SkillRegistryEntry {
  id: string;
  order: number;
  phase: string;
  pack: string;
  description: string;
  intents: string[];
  requires: string[];
  produces: string[];
  gates: string[];
  fallback: string | null;
  mutatesWorkspace: boolean;
  parallelSafe: boolean;
  next: string[];
  keywords: string[];
}

const PACK_NAMES: Record<string, string> = {
  core: 'Core Pack',
  intelligence: 'Intelligence Pack',
  build: 'Build Pack',
  proof: 'Proof Pack',
  delivery: 'Delivery Pack',
  evolution: 'Evolution Pack',
  system: 'System Pack',
  creator: 'Creator Pack',
};

const PACK_DESCRIPTIONS: Record<string, string> = {
  core: 'Essential lifecycle navigation, planning, bounded execution, and error recovery.',
  intelligence: 'Primary source research, external fact verification, and grounding.',
  build: 'Test-driven development, safe delegation, native code matching, and scope discipline.',
  proof: 'Adversarial review, penetration testing, automated healing, and evidence precedence.',
  delivery: 'Release certification, handoff management, autonomous completion, and maintainer care.',
  evolution: 'Agent-behavior evaluation and durable project engineering knowledge capture.',
  system: 'Low-level cognitive reflexes, architecture enforcement, memory, and orchestration.',
  creator: 'Deep Playbook V2 skill creation and domain adaptation.',
};

const registryPath = path.join(repoRoot, 'skills', 'get-fable', 'registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as {
  schemaVersion: number;
  entry: string;
  skills: SkillRegistryEntry[];
};

function parseSkillMd(skillId: string) {
  const filePath = path.join(repoRoot, 'skills', skillId, 'SKILL.md');
  if (!fs.existsSync(filePath)) {
    return { frontmatter: {} as Record<string, any>, body: '', rawText: '' };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
  const frontmatterRaw = frontmatterMatch ? frontmatterMatch[1] : '';
  const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length).trim() : content.trim();

  const frontmatter: Record<string, any> = {};
  for (const line of frontmatterRaw.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !line.startsWith(' ') && !line.startsWith('-')) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      frontmatter[key] = val;
    }
  }

  return { frontmatter, body, rawText: content };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdownToHtml(md: string): string {
  // A clean, predictable, lightweight markdown to semantic HTML converter
  const lines = md.split(/\r?\n/);
  let html = '';
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = '';
  let inList = false;
  let inTable = false;
  let tableHeaderParsed = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>\n';
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html += '</tbody></table></div>\n';
      inTable = false;
      tableHeaderParsed = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<div class="code-block"><button class="copy-button" data-copy aria-label="Copy code">Copy</button><pre><code class="language-${codeLang}">${escapeHtml(codeBuffer.trim())}</code></pre></div>\n`;
        inCodeBlock = false;
        codeBuffer = '';
      } else {
        closeList();
        closeTable();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer += line + '\n';
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeList();
      const rawCols = line.split('|').slice(1, -1).map((c) => c.trim());
      // Check if separator
      if (rawCols.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableHeaderParsed = true;
        html += '<div class="table-wrapper"><table class="docs-table"><thead><tr>';
        for (const col of rawCols) {
          html += `<th>${inlineFormat(col)}</th>`;
        }
        html += '</tr></thead><tbody>\n';
        continue;
      } else {
        html += '<tr>';
        for (const col of rawCols) {
          html += `<td>${inlineFormat(col)}</td>`;
        }
        html += '</tr>\n';
        continue;
      }
    } else {
      closeTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      closeList();
      html += `<h1>${inlineFormat(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      html += `<h2>${inlineFormat(line.slice(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      html += `<h3>${inlineFormat(line.slice(4))}</h3>\n`;
      continue;
    }
    if (line.startsWith('#### ')) {
      closeList();
      html += `<h4>${inlineFormat(line.slice(5))}</h4>\n`;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      closeList();
      html += `<blockquote><p>${inlineFormat(line.slice(2))}</p></blockquote>\n`;
      continue;
    }

    // Unordered lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        inList = true;
        html += '<ul class="docs-list">\n';
      }
      html += `<li>${inlineFormat(line.slice(2))}</li>\n`;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      closeList();
      continue;
    }

    // Paragraph
    closeList();
    html += `<p>${inlineFormat(line)}</p>\n`;
  }

  closeList();
  closeTable();
  return html;
}

function inlineFormat(text: string): string {
  let res = escapeHtml(text);
  // Bold
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code
  res = res.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>');
  return res;
}

function cleanMarkdownToPlainText(md: string): string {
  return md
    .replace(/^---[\s\S]*?---/g, '')
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*\n?/g, ''))
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\|/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderHeader(activeTab: string, depth = 0): string {
  const rel = depth === 0 ? './' : '../';
  return `  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="${rel}index.html" aria-label="get-fable home">
        <img src="${rel}assets/mascot.svg" alt="" width="36" height="36">
        <span>get-fable</span>
      </a>

      <nav class="site-nav" aria-label="Primary navigation">
        <a href="${rel}index.html#thesis"${activeTab === 'thesis' ? ' class="is-active"' : ''}>Thesis</a>
        <a href="${rel}skills.html"${activeTab === 'skills' ? ' class="is-active"' : ''}>Skills (42)</a>
        <a href="${rel}guide.html"${activeTab === 'guide' ? ' class="is-active"' : ''}>Guide &amp; Docs</a>
        <a href="${rel}workflows.html"${activeTab === 'workflows' ? ' class="is-active"' : ''}>Workflows &amp; Prompts</a>
        <a href="${rel}pricing.html"${activeTab === 'pricing' ? ' class="is-active"' : ''}>Pricing</a>
      </nav>

      <a class="header-github" href="https://github.com/imMamdouhaboammar/get-fable" target="_blank" rel="noreferrer">
        GitHub
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </header>`;
}

function renderFooter(depth = 0): string {
  const rel = depth === 0 ? './' : '../';
  return `  <footer class="site-footer">
    <div class="shell footer-inner">
      <div class="footer-brand">
        <img src="${rel}assets/mascot.svg" alt="" width="28" height="28" loading="lazy">
        <span>get-fable</span>
      </div>
      <nav class="footer-links" aria-label="Footer navigation">
        <a href="${rel}index.html">Home</a>
        <a href="${rel}skills.html">Skills Catalog</a>
        <a href="${rel}guide.html">User Guide</a>
        <a href="${rel}workflows.html">Workflows &amp; Prompts</a>
        <a href="${rel}pricing.html">Pricing (Free OSS)</a>
        <a href="${rel}llms.txt">llms.txt</a>
        <a href="${rel}sitemap.xml">Sitemap</a>
      </nav>
      <p>Open source under MIT · <span data-year>2026</span></p>
      <a href="#top">Back to top ↑</a>
    </div>
  </footer>`;
}

function renderFormatSwitcher(baseName: string, depth = 0): string {
  const rel = depth === 0 ? './' : '../';
  return `      <aside class="format-switcher" aria-label="Alternate page formats">
        <span class="format-label">Formats:</span>
        <span class="format-badge is-active">HTML</span>
        <a class="format-badge" href="${rel}${baseName}.md" target="_blank">Markdown (.md)</a>
        <a class="format-badge" href="${rel}${baseName}.txt" target="_blank">Plain Text (.txt)</a>
        <a class="format-badge" href="${rel}${baseName}.json" target="_blank">JSON (.json)</a>
      </aside>`;
}

// ==========================================
// 1. GENERATE SKILLS STANDALONE PAGES
// ==========================================
console.log('Generating 42 standalone skill pages (.html, .md, .txt, .json)...');

for (const skill of registry.skills) {
  const { frontmatter, body, rawText } = parseSkillMd(skill.id);
  const packName = PACK_NAMES[skill.pack] || skill.pack;
  const canonicalUrl = `https://get-fable.vercel.app/skills/${skill.id}.html`;
  const baseName = `skills/${skill.id}`;

  // JSON representation
  const skillJson = {
    id: skill.id,
    order: skill.order,
    pack: skill.pack,
    packName,
    phase: skill.phase,
    description: skill.description,
    intents: skill.intents,
    requires: skill.requires,
    produces: skill.produces,
    gates: skill.gates,
    fallback: skill.fallback,
    mutatesWorkspace: skill.mutatesWorkspace,
    parallelSafe: skill.parallelSafe,
    next: skill.next,
    keywords: skill.keywords,
    frontmatter,
    content_markdown: body,
    canonical_url: canonicalUrl,
    license: 'MIT',
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(siteDir, `${baseName}.json`), JSON.stringify(skillJson, null, 2), 'utf-8');

  // Markdown representation
  const skillMdContent = `---
id: ${skill.id}
pack: ${skill.pack}
phase: ${skill.phase}
order: ${skill.order}
canonical_url: ${canonicalUrl}
---

# ${skill.id}

> **${skill.description}**

- **Pack:** ${packName}
- **Lifecycle Phase:** \`${skill.phase}\`
- **Mutates Workspace:** ${skill.mutatesWorkspace ? 'Yes' : 'No'}
- **Parallel Safe:** ${skill.parallelSafe ? 'Yes' : 'No'}
- **Fallback Skill:** \`${skill.fallback || 'None'}\`

## Activation CLI Command

\`\`\`bash
bun ./bin/get-fable.js route "${skill.intents[0] || skill.id}" --apply
\`\`\`

## Registered Intents
${skill.intents.map((i) => `- \`${i}\``).join('\n')}

## Required Gates
${skill.gates.length ? skill.gates.map((g) => `- \`${g}\``).join('\n') : '- None'}

## Next Allowed Skills
${skill.next.map((n) => `- \`${n}\``).join('\n')}

---

${body}
`;
  fs.writeFileSync(path.join(siteDir, `${baseName}.md`), skillMdContent, 'utf-8');

  // Plain text representation
  const plainText = cleanMarkdownToPlainText(skillMdContent);
  fs.writeFileSync(path.join(siteDir, `${baseName}.txt`), plainText, 'utf-8');

  // HTML representation
  const bodyHtml = renderMarkdownToHtml(body);
  const nextSkillLinks = skill.next
    .map((n) => `<a class="token-link" href="../skills/${n}.html">${n}</a>`)
    .join(' ');
  const intentsBadges = skill.intents
    .map((i) => `<span class="intent-chip">${escapeHtml(i)}</span>`)
    .join(' ');
  const gatesList = skill.gates.length
    ? skill.gates.map((g) => `<li><code>${escapeHtml(g)}</code></li>`).join('')
    : '<li><em>None</em></li>';

  const skillHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#FFFFFF">
  <meta name="description" content="${escapeHtml(skill.description)} - get-fable canonical skill reference and activation guide.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" type="text/markdown" href="../${baseName}.md">
  <link rel="alternate" type="text/plain" href="../${baseName}.txt">
  <link rel="alternate" type="application/json" href="../${baseName}.json">

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(skill.id)} — get-fable Skill Reference">
  <meta property="og:description" content="${escapeHtml(skill.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="https://get-fable.vercel.app/assets/mascot.svg">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(skill.id)} — get-fable Skill">
  <meta name="twitter:description" content="${escapeHtml(skill.description)}">
  <meta name="twitter:image" content="https://get-fable.vercel.app/assets/mascot.svg">

  <title>${escapeHtml(skill.id)} — get-fable Skill Reference</title>
  <link rel="icon" href="../assets/mascot.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../styles.css">
  <script src="../script.js" defer></script>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "${escapeHtml(skill.id)} Skill Specification",
    "description": "${escapeHtml(skill.description)}",
    "articleSection": "${escapeHtml(packName)}",
    "url": "${canonicalUrl}",
    "author": {
      "@type": "Organization",
      "name": "get-fable Team"
    },
    "inLanguage": "en"
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>

${renderHeader('skills', 1)}

  <main id="main-content" class="skill-detail-main">
    <div class="shell">
      <nav class="breadcrumbs" aria-label="Breadcrumbs">
        <a href="../index.html">Home</a>
        <span>/</span>
        <a href="../skills.html">Skills</a>
        <span>/</span>
        <span aria-current="page">${escapeHtml(skill.id)}</span>
      </nav>

${renderFormatSwitcher(baseName, 1)}

      <header class="skill-header">
        <div class="skill-meta-tags">
          <span class="pack-badge">${escapeHtml(packName)}</span>
          <span class="phase-badge phase-${escapeHtml(skill.phase)}">Phase: ${escapeHtml(skill.phase)}</span>
          <span class="order-badge">Order: ${skill.order}</span>
        </div>
        <h1 class="skill-title">${escapeHtml(skill.id)}</h1>
        <p class="skill-lead">${escapeHtml(skill.description)}</p>
      </header>

      <section class="skill-command-box" aria-labelledby="quick-activation">
        <h2 id="quick-activation" class="visually-hidden">Quick Activation</h2>
        <div class="code-block">
          <button class="copy-button" data-copy aria-label="Copy activation command">Copy</button>
          <pre><code>bun ./bin/get-fable.js route "${escapeHtml(skill.intents[0] || skill.id)}" --apply</code></pre>
        </div>
      </section>

      <div class="skill-layout">
        <aside class="skill-specs-card">
          <h2>Specifications</h2>
          <dl class="specs-list">
            <dt>Pack</dt>
            <dd>${escapeHtml(packName)}</dd>
            <dt>Lifecycle Phase</dt>
            <dd><span class="phase-tag">${escapeHtml(skill.phase)}</span></dd>
            <dt>Mutates Workspace</dt>
            <dd>${skill.mutatesWorkspace ? 'Yes (advances mutationGeneration)' : 'No (read-only)'}</dd>
            <dt>Parallel Safe</dt>
            <dd>${skill.parallelSafe ? 'Yes' : 'No'}</dd>
            <dt>Fallback Skill</dt>
            <dd>${skill.fallback ? `<a href="../skills/${escapeHtml(skill.fallback)}.html">${escapeHtml(skill.fallback)}</a>` : '<em>None</em>'}</dd>
          </dl>

          <h3>Intents</h3>
          <div class="intents-list">${intentsBadges}</div>

          <h3>Required Gates</h3>
          <ul class="gates-list">${gatesList}</ul>

          <h3>Permitted Continuations</h3>
          <div class="next-links">${nextSkillLinks || '<em>None</em>'}</div>
        </aside>

        <article class="skill-content-body">
          ${bodyHtml}
        </article>
      </div>

      <nav class="page-bottom-nav">
        <a href="../skills.html" class="action action-secondary">← Back to Skills Catalog</a>
        <a href="../workflows.html" class="action action-primary">Explore Workflows &amp; Prompts →</a>
      </nav>
    </div>
  </main>

${renderFooter(1)}
</body>
</html>`;

  fs.writeFileSync(path.join(siteDir, `${baseName}.html`), skillHtml, 'utf-8');
}

// ==========================================
// 2. GENERATE SKILLS CATALOG PAGE (skills.html)
// ==========================================
console.log('Generating skills catalog page (site/skills.html)...');
const skillsCatalogBase = 'skills';
const skillsJson = {
  title: 'get-fable 42 Canonical Skills Catalog',
  description: 'Deterministic specialist skills for AI coding agents across 8 packs with formal gates and evidence contracts.',
  totalSkills: registry.skills.length,
  packs: Object.keys(PACK_NAMES).map((p) => ({
    id: p,
    name: PACK_NAMES[p],
    description: PACK_DESCRIPTIONS[p],
    skills: registry.skills.filter((s) => s.pack === p).map((s) => s.id),
  })),
  skills: registry.skills.map((s) => ({
    id: s.id,
    order: s.order,
    phase: s.phase,
    pack: s.pack,
    description: s.description,
    intents: s.intents,
    url: `https://get-fable.vercel.app/skills/${s.id}.html`,
  })),
  canonical_url: 'https://get-fable.vercel.app/skills.html',
};

fs.writeFileSync(path.join(siteDir, `${skillsCatalogBase}.json`), JSON.stringify(skillsJson, null, 2), 'utf-8');

const skillsMdContent = `# get-fable 42 Canonical Skills Catalog

> The canonical skill registry is deterministic and authoritative. Each skill enforces explicit phase contracts, mutation tracking, and verification gates.

## Total Skills: 42 across 8 Packs

${Object.keys(PACK_NAMES)
  .map((p) => {
    const pSkills = registry.skills.filter((s) => s.pack === p);
    return `### ${PACK_NAMES[p]} (${pSkills.length} Skills)
${PACK_DESCRIPTIONS[p]}

${pSkills
  .map(
    (s) =>
      `- **[${s.id}](./skills/${s.id}.md)** (\`${s.phase}\`): ${s.description} (Intents: ${s.intents.map((i) => `\`${i}\``).join(', ')})`
  )
  .join('\n')}
`;
  })
  .join('\n')}
`;

fs.writeFileSync(path.join(siteDir, `${skillsCatalogBase}.md`), skillsMdContent, 'utf-8');
fs.writeFileSync(path.join(siteDir, `${skillsCatalogBase}.txt`), cleanMarkdownToPlainText(skillsMdContent), 'utf-8');

// Build skills HTML cards
const skillCardsHtml = registry.skills
  .map((s) => {
    const packName = PACK_NAMES[s.pack] || s.pack;
    return `        <article class="skill-card" data-pack="${escapeHtml(s.pack)}" data-phase="${escapeHtml(s.phase)}" data-keywords="${escapeHtml([...s.keywords, ...s.intents, s.id, s.description].join(' ').toLowerCase())}">
          <div class="skill-card-head">
            <span class="pack-badge">${escapeHtml(packName)}</span>
            <span class="phase-badge phase-${escapeHtml(s.phase)}">${escapeHtml(s.phase)}</span>
          </div>
          <h3 class="skill-card-title">
            <a href="./skills/${escapeHtml(s.id)}.html">${escapeHtml(s.id)}</a>
          </h3>
          <p class="skill-card-desc">${escapeHtml(s.description)}</p>
          <div class="skill-card-intents">
            ${s.intents.slice(0, 3).map((i) => `<span class="intent-chip">${escapeHtml(i)}</span>`).join('')}
          </div>
          <div class="skill-card-foot">
            <a class="skill-card-link" href="./skills/${escapeHtml(s.id)}.html">View Skill Guide →</a>
          </div>
        </article>`;
  })
  .join('\n');

const skillsHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#FFFFFF">
  <meta name="description" content="Explore the 42 canonical get-fable skills across 8 packs. Deterministic routing, durable state, and evidence precedence for AI coding agents.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="https://get-fable.vercel.app/skills.html">
  <link rel="alternate" type="text/markdown" href="./skills.md">
  <link rel="alternate" type="text/plain" href="./skills.txt">
  <link rel="alternate" type="application/json" href="./skills.json">

  <!-- Open Graph -->
  <meta property="og:title" content="get-fable 42 Canonical Skills Catalog">
  <meta property="og:description" content="Explore the 42 canonical skills across 8 packs. Deterministic routing, durable state, and evidence precedence for AI coding agents.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://get-fable.vercel.app/skills.html">
  <meta property="og:image" content="https://get-fable.vercel.app/assets/mascot.svg">

  <title>get-fable 42 Canonical Skills Catalog</title>
  <link rel="icon" href="./assets/mascot.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./styles.css">
  <script src="./script.js" defer></script>

  <!-- Schema.org ItemList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "get-fable Skills Catalog",
    "numberOfItems": 42,
    "itemListElement": [
      ${registry.skills.map((s, idx) => `{
        "@type": "ListItem",
        "position": ${idx + 1},
        "name": "${escapeHtml(s.id)}",
        "description": "${escapeHtml(s.description)}",
        "url": "https://get-fable.vercel.app/skills/${s.id}.html"
      }`).join(',\n      ')}
    ]
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>

${renderHeader('skills', 0)}

  <main id="main-content" class="catalog-main">
    <div class="shell">
      <header class="catalog-header">
        <div class="section-marker">CANONICAL REGISTRY</div>
        <h1>42 Canonical Skills</h1>
        <p class="catalog-summary">Every skill has a bounded contract, lifecycle phase, mutation awareness, and falsifiable completion gates.</p>
${renderFormatSwitcher('skills', 0)}
      </header>

      <div class="catalog-controls" aria-label="Catalog search and filter">
        <div class="search-box">
          <input type="search" id="skill-search" placeholder="Search skills, intents, keywords..." aria-label="Search skills">
        </div>
        <div class="pack-filters" role="tablist" aria-label="Filter by skill pack">
          <button type="button" class="filter-chip is-active" data-filter="all" role="tab" aria-selected="true">All (42)</button>
          <button type="button" class="filter-chip" data-filter="core" role="tab">Core (7)</button>
          <button type="button" class="filter-chip" data-filter="intelligence" role="tab">Intelligence (1)</button>
          <button type="button" class="filter-chip" data-filter="build" role="tab">Build (4)</button>
          <button type="button" class="filter-chip" data-filter="proof" role="tab">Proof (6)</button>
          <button type="button" class="filter-chip" data-filter="delivery" role="tab">Delivery (5)</button>
          <button type="button" class="filter-chip" data-filter="evolution" role="tab">Evolution (2)</button>
          <button type="button" class="filter-chip" data-filter="system" role="tab">System (15)</button>
          <button type="button" class="filter-chip" data-filter="creator" role="tab">Creator (2)</button>
        </div>
      </div>

      <div class="skills-grid" id="skills-grid">
${skillCardsHtml}
      </div>
      <p id="no-skills-match" class="no-results-msg" style="display: none;">No skills match your filter or search query.</p>
    </div>
  </main>

${renderFooter(0)}
</body>
</html>`;

fs.writeFileSync(path.join(siteDir, 'skills.html'), skillsHtml, 'utf-8');

// ==========================================
// 3. GENERATE GUIDE & DOCUMENTATION (guide.html / docs.html)
// ==========================================
console.log('Generating comprehensive user guide & documentation (site/guide.html)...');

const guideMdContent = `# get-fable Authoritative User Guide & Architecture Documentation

Version: **1.11.1** · Schema: **v3** · Canonical Skills: **42** · Supported Platforms: **32**

> **get-fable adds frontier-style execution discipline around AI coding agents with specs, persistent task state, lifecycle hooks, reusable skills, failure handling, and verification.**

---

## 1. Introduction: The Working Conditions Thesis

Frontier AI coding agents feel dramatically different not just because of raw model weights, but because of the **working conditions** around the model:
1. **Spec before work**: Explicit constraints and tests defined before code generation.
2. **State survives the conversation**: Persistent tasks, mutation tracking, and evidence stored on disk in \`.fable/state.json\` and \`.fable/LEDGER.md\`.
3. **Failure changes strategy**: The Fable Circuit Breaker detects \`failureStreak >= 2\` and unconditionally routes to \`fable-recover\`.
4. **Observable evidence before close**: Work cannot be marked complete without fresh, passing machine-checkable evidence recorded for the current mutation generation.

---

## 2. Prerequisites & Quickstart

### Runtime Requirements
- **Bun ≥ 1.3.0** (mandatory package manager and runtime)
- **Python 3.9+** (powers the 5 zero-overhead lifecycle hooks)
- **Git** (for version control and repository isolation)

### Installation
Clone the repository and run the multi-platform installer:

\`\`\`bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

# Check health and environment
bun ./bin/get-fable.js doctor

# Enumerate bundled assets
bun ./bin/get-fable.js assets

# Install to all detected host environments
bun ./bin/get-fable.js install all
\`\`\`

---

## 3. The 7-Phase State Machine Contract

get-fable operates under a strictly enforced lifecycle state machine:

\`\`\`text
idle -> discovering -> planned -> executing -> verifying -> complete
                                           -> recovering
                                           -> blocked
\`\`\`

### Phase Definitions
| Phase | Active Specialist | Expected Action |
|---|---|---|
| \`idle\` | \`get-fable\` | Task routing and situational assessment |
| \`discovering\` | \`fable-discover\`, \`fable-research\` | Trace real execution paths and resolve unknowns |
| \`planned\` | \`fable-plan\`, \`fable-architecture\` | Author bounded, falsifiable work cards |
| \`executing\` | \`fable-execute\`, \`fable-tdd\` | Implement accepted card with zero scope drift |
| \`verifying\` | \`fable-verify\`, \`fable-review\` | Execute fresh machine-checked tests & typechecks |
| \`recovering\` | \`fable-recover\` | Diagnose harness & execution-path failures at streak >= 2 |
| \`complete\` | Terminal | All criteria met with fresh evidence stamp |

---

## 4. The Evidence Protocol

A run is **never complete** because the model "thinks" it is done. It requires an observable evidence stamp recorded after the final file edit.

### Recording Evidence
\`\`\`bash
# Record passing test evidence
bun ./bin/get-fable.js evidence pass test "bun test" "1049 tests pass across 154 files"

# Record passing build evidence
bun ./bin/get-fable.js evidence pass build "bun run build" "host and client bundles built cleanly"
\`\`\`

### Invariants:
1. \`mutationGeneration\` advances whenever a file editing tool is invoked (even on failed edits).
2. All older verification becomes stale when \`mutationGeneration > verifiedGeneration\`.
3. The Stop hook blocks termination if unverified mutations exist.

---

## 5. 32-Platform Ecosystem Integration Matrix

get-fable integrates seamlessly across all major AI coding platforms:

### Tier 1: Full Lifecycle (Hooks + Rules + Skills)
- **Claude Code**: 5 Python lifecycle hooks, \`CLAUDE.md\`, and 42 skills.
- **Antigravity & Gemini CLI**: Native hook triggers, \`plugin.json\`, and rules.
- **xAI Grok Build**: Full plugin manifest, hooks, and Grok bot adapter.

### Tier 2: Skill + Plugin + Rule
- **OpenAI Codex & ChatGPT**: OpenAPI Custom Actions and plugin manifest.

### Tier 3: Skill + Rule
- **Devin, Cline, Roo Code, OpenHands, Kilo Code, Hermes Agent**.

### Tier 4: Advisory Rule
- **Cursor, Windsurf, GitHub Copilot, Replit, Amazon Q, Trae, Warp, Aider**.

---

## 6. Multi-Agent Delegation & TOON Protocol

When delegating tasks across parallel subagents, get-fable enforces three prerequisites:
1. **Write Independence**: Disjoint files or directories.
2. **Semantic Independence**: Independent data contracts.
3. **Verification Independence**: Independent validation checks.

Multi-agent payloads use **TOON (Token-Optimized Object Notation)** via \`@toon-format/toon\`, reducing token overhead by 30–50% compared to raw JSON blobs.

---

## 7. Architecture Enforcement (ADR 0007)

The \`fable-architecture\` engine evaluates software specifications across three lockout vectors:
- **Scale & Load (>= 7)**: Prohibits monolith architectures.
- **Domain Decoupling (>= 6)**: Enforces bounded contexts.
- **Resource Intensity (>= 8)**: Dictates specialized language matrix.

**Transport Standard**:
- **North-South (Edge)**: HTTP / REST / GraphQL.
- **East-West (Internal Mesh)**: gRPC Protobuf or Message Broker. Prohibits internal HTTP/JSON meshes.

---

## 8. Automated Penetration Testing & Self-Healing

- \`fable-redteam\`: Executes black-box probes for injection, auth bypass, CORS reflection, sensitive file exposure, and BOLA. Emits CVSS v3.1 scores and SARIF reports.
- \`fable-heal\`: Ingests SARIF findings, synthesizes surgical code fixes, verifies with regression tests, and seals an attestation proof.

---

## 9. Durable Engineering Learning (\`Failure-lessons/\`)

get-fable compounds learnings permanently so engineering teams never pay for the same mistake twice:
\`\`\`bash
bun ./bin/get-fable.js learn --failure-lessons
\`\`\`
Extracts session mistakes and root causes into \`Failure-lessons/\`, \`.fable/learnings.json\`, and \`agent-kernel\`.

---

## 10. CLI Command Reference

\`\`\`bash
# Lifecycle state management
bun ./bin/get-fable.js status [--json-v1]
bun ./bin/get-fable.js doctor [--json-v1]
bun ./bin/get-fable.js route "<task>" [--apply]
bun ./bin/get-fable.js state <phase> [--substantial]
bun ./bin/get-fable.js card "<text>" [--clear]
bun ./bin/get-fable.js evidence <pass|fail> <kind> "<source>" "<detail>"
bun ./bin/get-fable.js lint

# Architecture & Security
bun ./bin/get-fable.js arch-eval "<spec>"
bun ./bin/get-fable.js redteam scan --target <url>
bun ./bin/get-fable.js heal

# Multi-Agent gRPC Worker
bun ./bin/get-fable.js worker-serve
\`\`\`
`;

fs.writeFileSync(path.join(siteDir, 'guide.md'), guideMdContent, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'guide.txt'), cleanMarkdownToPlainText(guideMdContent), 'utf-8');
fs.writeFileSync(
  path.join(siteDir, 'guide.json'),
  JSON.stringify(
    {
      title: 'get-fable Authoritative User Guide & Technical Documentation',
      description: 'Comprehensive usage guide, lifecycle state machine, evidence protocol, and architecture enforcement reference.',
      canonical_url: 'https://get-fable.vercel.app/guide.html',
      content_markdown: guideMdContent,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  ),
  'utf-8'
);

// Mirror to docs.md, docs.txt, docs.json for backwards compatibility
fs.writeFileSync(path.join(siteDir, 'docs.md'), guideMdContent, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'docs.txt'), cleanMarkdownToPlainText(guideMdContent), 'utf-8');
fs.writeFileSync(
  path.join(siteDir, 'docs.json'),
  JSON.stringify(
    {
      title: 'get-fable Technical Documentation',
      description: 'Authoritative documentation and usage guide for get-fable across Bun, Claude Code, Antigravity, Gemini CLI, and Agent Kernel.',
      canonical_url: 'https://get-fable.vercel.app/docs.html',
      content_markdown: guideMdContent,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  ),
  'utf-8'
);

const guideHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#FFFFFF">
  <meta name="description" content="Official get-fable User Guide and Architecture Documentation. Master the 7-phase state machine, evidence protocol, multi-agent TOON delegation, and CLI commands.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="https://get-fable.vercel.app/guide.html">
  <link rel="alternate" type="text/markdown" href="./guide.md">
  <link rel="alternate" type="text/plain" href="./guide.txt">
  <link rel="alternate" type="application/json" href="./guide.json">

  <!-- Open Graph -->
  <meta property="og:title" content="get-fable User Guide &amp; Technical Documentation">
  <meta property="og:description" content="Master the 7-phase state machine, evidence protocol, multi-agent TOON delegation, and CLI commands.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://get-fable.vercel.app/guide.html">
  <meta property="og:image" content="https://get-fable.vercel.app/assets/mascot.svg">

  <title>User Guide &amp; Technical Documentation — get-fable</title>
  <link rel="icon" href="./assets/mascot.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./styles.css">
  <script src="./script.js" defer></script>

  <!-- Schema.org TechArticle & FAQ -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "get-fable User Guide & Technical Documentation",
    "description": "Comprehensive guide for setting up and operating the get-fable coding lifecycle harness across 32 AI platforms.",
    "url": "https://get-fable.vercel.app/guide.html",
    "inLanguage": "en"
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>

${renderHeader('guide', 0)}

  <main id="main-content" class="docs-main">
    <div class="shell">
      <header class="docs-header">
        <div class="section-marker">DOCUMENTATION</div>
        <h1>User Guide &amp; System Architecture</h1>
        <p class="docs-lead">Complete operational manual for get-fable: lifecycle mechanics, state invariants, evidence verification, and multi-agent systems.</p>
${renderFormatSwitcher('guide', 0)}
      </header>

      <div class="guide-grid">
        <aside class="docs-sidebar" aria-label="Table of contents">
          <nav class="toc-nav">
            <div class="toc-title">Table of Contents</div>
            <ul class="toc-list">
              <li><a href="#1-introduction-the-working-conditions-thesis">1. The Working Conditions Thesis</a></li>
              <li><a href="#2-prerequisites--quickstart">2. Prerequisites &amp; Quickstart</a></li>
              <li><a href="#3-the-7-phase-state-machine-contract">3. 7-Phase State Machine</a></li>
              <li><a href="#4-the-evidence-protocol">4. Evidence Protocol</a></li>
              <li><a href="#5-32-platform-ecosystem-integration-matrix">5. 32-Platform Ecosystem</a></li>
              <li><a href="#6-multi-agent-delegation--toon-protocol">6. Multi-Agent &amp; TOON</a></li>
              <li><a href="#7-architecture-enforcement-adr-0007">7. Architecture Enforcement</a></li>
              <li><a href="#8-automated-penetration-testing--self-healing">8. Security &amp; Self-Healing</a></li>
              <li><a href="#9-durable-engineering-learning-failure-lessons">9. Durable Learning</a></li>
              <li><a href="#10-cli-command-reference">10. CLI Command Reference</a></li>
            </ul>
          </nav>
        </aside>

        <article class="docs-body">
          ${renderMarkdownToHtml(guideMdContent)}
        </article>
      </div>
    </div>
  </main>

${renderFooter(0)}
</body>
</html>`;

fs.writeFileSync(path.join(siteDir, 'guide.html'), guideHtml, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'docs.html'), guideHtml, 'utf-8');

// ==========================================
// 4. GENERATE WORKFLOWS & PROMPTS (workflows.html / prompts.html)
// ==========================================
console.log('Generating useful workflows and prompts hub (site/workflows.html)...');

const workflowsMdContent = `# Useful Workflows and Production Prompts for get-fable

> **Battle-tested recipes, end-to-end multi-agent pipelines, and copy-paste prompts to unlock the full power of get-fable across Claude Code, Antigravity, Grok, Codex, and Cursor.**

---

## Part 1: High-Leverage Autonomous Workflows

### Workflow 1: Zero-Drift Feature Development (The Canonical TDD Loop)
**Goal:** Implement new features with 100% test coverage and strict scope boundaries.

\`\`\`bash
# 1. Inspect execution path and dependencies
bun ./bin/get-fable.js route "inspect existing payment webhooks before adding Stripe support" --apply

# 2. Define bounded spec and acceptance criteria
bun ./bin/get-fable.js card "Implement idempotent Stripe invoice.paid webhook handler"
bun ./bin/get-fable.js state planned --substantial

# 3. Write failing regression test first (Red phase)
bun ./bin/get-fable.js route "write failing test for duplicate Stripe event IDs" --apply

# 4. Implement minimal production logic (Green phase)
bun ./bin/get-fable.js state executing --substantial

# 5. Execute test suite and seal proof
bun test test/stripe-webhook.test.ts
bun ./bin/get-fable.js evidence pass test "bun test test/stripe-webhook.test.ts" "duplicate event IDs handled idempotently"

# 6. Certify release readiness
bun ./bin/get-fable.js route "certify release readiness" --apply
bun ./bin/get-fable.js state complete
\`\`\`

---

### Workflow 2: Automated Red Team & Self-Healing Loop
**Goal:** Run black-box security scanning and automatically remediate vulnerabilities.

\`\`\`bash
# 1. Execute penetration test against staging service
bun ./bin/get-fable.js redteam scan --target https://api.staging.example.com --profile standard --fail-on-cvss 7.0

# 2. View SARIF report output in docs/security/
cat docs/security/REDTEAM_REPORT.md

# 3. Trigger autonomous healing specialist
bun ./bin/get-fable.js route "synthesize and verify patches for SARIF findings" --apply
bun ./bin/get-fable.js heal

# 4. Verify remediations and generate attestation
bun ./bin/get-fable.js evidence pass security "fable-heal" "All 3 high-severity findings remediated and regression-tested"
\`\`\`

---

### Workflow 3: Legacy Refactoring & AI Anti-Slop (Fable-Wise Loop)
**Goal:** Strip AI boilerplate, eliminate duplicated configurations, and rewrite drifted files to clean v0.

\`\`\`bash
# 1. Activate Fable-Wise cognitive reflex
bun ./bin/get-fable.js route "consolidate scattered configs into single source of truth" --apply

# 2. Execute /ssotize to unify parameters
# 3. Execute /detool to replace bloated third-party libraries with native language constructs
# 4. Execute /feynman to stress-test clarity
# 5. Verify zero behavior drift
bun test
bun ./bin/get-fable.js evidence pass test "bun test" "Refactored with 0 behavioral changes and -450 lines of boilerplate"
\`\`\`

---

### Workflow 4: Scale Threshold Architecture Inception
**Goal:** Evaluate system requirements and enforce microservices decomposition before code generation.

\`\`\`bash
# 1. Evaluate architectural vectors
bun ./bin/get-fable.js arch-eval "High-throughput streaming analytics platform handling 50k events/sec with financial transaction settlement"

# 2. If composite score >= 7.0, allowMonolith is locked to FALSE.
# 3. Generate East-West gRPC Protobuf interfaces and worker bindings:
bun ./bin/get-fable.js worker-serve
\`\`\`

---

### Workflow 5: Multi-Model Deliberation Council
**Goal:** Convene a council across installed CLI agents before committing to risky technical decisions.

\`\`\`bash
bun ./bin/get-fable.js route "convene council of Claude, Gemini, and Grok to evaluate Postgres vs DynamoDB for append-only audit ledger" --apply
\`\`\`

---

### Workflow 6: Failure Compounding & Durable Memory
**Goal:** Automatically capture unexpected engineering lessons so future agents never repeat them.

\`\`\`bash
# Extract durable lessons into Failure-lessons/ and agent-kernel
bun ./bin/get-fable.js learn --failure-lessons
\`\`\`

---

## Part 2: Production Prompt Library

### Prompt 1: Claude Code Frontier Executive Harness Directive
Use this as the system directive in \`CLAUDE.md\` or session header:

\`\`\`markdown
You are operating under get-fable execution discipline.
Rules:
1. Always run \`bun ./bin/get-fable.js status\` before touching code.
2. Formulate a bounded spec and verify acceptance tests first.
3. Every file mutation advances \`mutationGeneration\` — never claim completion with stale evidence.
4. If two consecutive commands fail (failureStreak >= 2), halt and enter \`fable-recover\` diagnosis.
5. Record passing evidence using \`bun ./bin/get-fable.js evidence pass <kind> "<cmd>" "<detail>"\` before closing.
\`\`\`

---

### Prompt 2: Antigravity / Gemini CLI Autonomous Superplatform Prompt
\`\`\`markdown
Enforce the Compound Engineering 80/20 loop and get-fable lifecycle:
- 80% planning, interface verification, and AST blast-radius checks before writing implementation.
- Fable Circuit Breaker active: halt speculative edits if failureStreak >= 2.
- 3-Pass Verification: Unit tests, Integration verification, AppSec audit.
- Durable codification: Write every newly learned failure mechanism to Failure-lessons/.
\`\`\`

---

### Prompt 3: xAI Grok Bot Pairing Prompt
\`\`\`markdown
You are Grok paired with get-fable.
- Route every incoming ask through \`bun ./bin/get-fable.js route "<task>"\`.
- Adhere to TOON format for all subagent payloads.
- Apply ADR 0007 transport invariants: HTTP on edge, gRPC on internal services.
- Zero sycophancy: answer direct, falsify claims ruthlessly.
\`\`\`

---

### Prompt 4: Fable-Wise Anti-Slop Directive
\`\`\`markdown
Apply /fable-wise reflexes:
- /re0: Rewrite drifted artifacts from a clean v0 rather than applying another fragile patch.
- /ssotize: Audit scattered parameters and designate one single source of truth.
- /detool: Replace incidental dependencies with native language primitives.
- /hate: Identify the single fatal contrarian objection that could kill this architecture.
- /sip: Verify with clean-and-true test suites before declaring success.
\`\`\`
`;

fs.writeFileSync(path.join(siteDir, 'workflows.md'), workflowsMdContent, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'workflows.txt'), cleanMarkdownToPlainText(workflowsMdContent), 'utf-8');
fs.writeFileSync(
  path.join(siteDir, 'workflows.json'),
  JSON.stringify(
    {
      title: 'Useful Workflows and Production Prompts for get-fable',
      description: 'Curated collection of autonomous coding pipelines, TDD loops, red team self-healing, and AI agent prompts.',
      canonical_url: 'https://get-fable.vercel.app/workflows.html',
      content_markdown: workflowsMdContent,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  ),
  'utf-8'
);

// Mirror to prompts.md, prompts.txt, prompts.json
fs.writeFileSync(path.join(siteDir, 'prompts.md'), workflowsMdContent, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'prompts.txt'), cleanMarkdownToPlainText(workflowsMdContent), 'utf-8');
fs.writeFileSync(
  path.join(siteDir, 'prompts.json'),
  JSON.stringify(
    {
      title: 'Useful Workflows and Production Prompts for get-fable',
      description: 'Curated collection of autonomous coding pipelines, TDD loops, red team self-healing, and AI agent prompts.',
      canonical_url: 'https://get-fable.vercel.app/prompts.html',
      content_markdown: workflowsMdContent,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  ),
  'utf-8'
);

const workflowsHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#FFFFFF">
  <meta name="description" content="Discover useful workflows, recipes, and production prompts to maximize get-fable for autonomous coding agents.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="https://get-fable.vercel.app/workflows.html">
  <link rel="alternate" type="text/markdown" href="./workflows.md">
  <link rel="alternate" type="text/plain" href="./workflows.txt">
  <link rel="alternate" type="application/json" href="./workflows.json">

  <!-- Open Graph -->
  <meta property="og:title" content="Useful Workflows &amp; Production Prompts — get-fable">
  <meta property="og:description" content="Battle-tested recipes, end-to-end multi-agent pipelines, and copy-paste prompts for Claude Code, Antigravity, Grok, and Codex.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://get-fable.vercel.app/workflows.html">
  <meta property="og:image" content="https://get-fable.vercel.app/assets/mascot.svg">

  <title>Useful Workflows &amp; Production Prompts — get-fable</title>
  <link rel="icon" href="./assets/mascot.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./styles.css">
  <script src="./script.js" defer></script>

  <!-- Schema.org HowTo -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to execute autonomous disciplined workflows with get-fable",
    "description": "Step-by-step production workflows for AI coding agents with formal lifecycle gates and verification.",
    "url": "https://get-fable.vercel.app/workflows.html"
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>

${renderHeader('workflows', 0)}

  <main id="main-content" class="workflows-main">
    <div class="shell">
      <header class="workflows-header">
        <div class="section-marker">PLAYBOOKS &amp; PROMPTS</div>
        <h1>Workflows &amp; Production Prompts</h1>
        <p class="workflows-lead">Practical recipes and copy-paste system prompts to orchestrate AI coding agents with zero drift and rigorous evidence.</p>
${renderFormatSwitcher('workflows', 0)}
      </header>

      <div class="workflows-layout">
        <aside class="docs-sidebar" aria-label="Workflows index">
          <nav class="toc-nav">
            <div class="toc-title">Workflows &amp; Prompts</div>
            <ul class="toc-list">
              <li><a href="#workflow-1-zero-drift-feature-development-the-canonical-tdd-loop">1. Zero-Drift TDD Loop</a></li>
              <li><a href="#workflow-2-automated-red-team--self-healing-loop">2. Red Team &amp; Self-Healing</a></li>
              <li><a href="#workflow-3-legacy-refactoring--ai-anti-slop-fable-wise-loop">3. Fable-Wise Anti-Slop</a></li>
              <li><a href="#workflow-4-scale-threshold-architecture-inception">4. Architecture Inception</a></li>
              <li><a href="#workflow-5-multi-model-deliberation-council">5. Council Deliberation</a></li>
              <li><a href="#workflow-6-failure-compounding--durable-memory">6. Failure Compounding</a></li>
              <li><a href="#part-2-production-prompt-library">Prompt Library</a></li>
            </ul>
          </nav>
        </aside>

        <article class="docs-body">
          ${renderMarkdownToHtml(workflowsMdContent)}
        </article>
      </div>
    </div>
  </main>

${renderFooter(0)}
</body>
</html>`;

fs.writeFileSync(path.join(siteDir, 'workflows.html'), workflowsHtml, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'prompts.html'), workflowsHtml, 'utf-8');

// ==========================================
// 5. GENERATE PRICING PAGE (pricing.html, .md, .txt, .json)
// ==========================================
console.log('Generating pricing & open source transparency page (site/pricing.html)...');

const pricingMdContent = `# Pricing & Licensing — get-fable

> **100% Free and Open Source. Zero Paywalls. Local-First Runtime.**

## Free & Open Source (Community Edition)
- **Price:** $0/month (Free Forever)
- **License:** MIT License
- **Usage Limits:** Unlimited tasks, unlimited agents, unlimited runs
- **Telemetry:** 100% local, zero external tracking, zero phone-home
- **Dependencies:** Runs natively on your machine via Bun & Python

### What is included:
- Full 42 canonical skills across 8 packs
- Lifecycle state machine and evidence protocol
- Fable Circuit Breaker recovery harness
- Automated RedTeam vulnerability scanner & self-healing engine
- 32-Platform ecosystem integrations (Claude Code, Antigravity, Grok, Codex, Cursor, etc.)
- Multi-agent TOON protocol & gRPC distributed worker service
- Durable engineering learning system (\`Failure-lessons/\`)

### FAQ for AI Buyer Agents
- **Is an account or API token required?** No. get-fable runs entirely locally in your repository.
- **Can I run this in CI/CD?** Yes, via \`bun ./bin/get-fable.js\` or npm packages.
`;

fs.writeFileSync(path.join(siteDir, 'pricing.md'), pricingMdContent, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'pricing.txt'), cleanMarkdownToPlainText(pricingMdContent), 'utf-8');
fs.writeFileSync(
  path.join(siteDir, 'pricing.json'),
  JSON.stringify(
    {
      title: 'get-fable Pricing & Licensing',
      price: '$0',
      currency: 'USD',
      billing_interval: 'perpetual',
      license: 'MIT',
      open_source: true,
      canonical_url: 'https://get-fable.vercel.app/pricing.html',
      features: [
        '42 Canonical Skills',
        '7-Phase Lifecycle State Machine',
        'Fable Circuit Breaker Recovery',
        'RedTeam Penetration Scanner & Self-Healing',
        '32-Platform Integrations',
        'Local-first, zero telemetry',
      ],
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  ),
  'utf-8'
);

const pricingHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#FFFFFF">
  <meta name="description" content="get-fable is 100% Free and Open Source under the MIT License. Zero subscription fees, zero paywalls, local-first runtime.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="https://get-fable.vercel.app/pricing.html">
  <link rel="alternate" type="text/markdown" href="./pricing.md">
  <link rel="alternate" type="text/plain" href="./pricing.txt">
  <link rel="alternate" type="application/json" href="./pricing.json">

  <!-- Open Graph -->
  <meta property="og:title" content="get-fable Pricing &amp; Open Source Licensing">
  <meta property="og:description" content="100% Free &amp; Open Source MIT License. No paywalls, no subscriptions, unlimited local runs.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://get-fable.vercel.app/pricing.html">
  <meta property="og:image" content="https://get-fable.vercel.app/assets/mascot.svg">

  <title>Pricing &amp; Open Source — get-fable</title>
  <link rel="icon" href="./assets/mascot.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./styles.css">
  <script src="./script.js" defer></script>

  <!-- Schema.org SoftwareApplication Offer -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "get-fable",
    "operatingSystem": "POSIX, macOS, Linux, Windows",
    "applicationCategory": "DeveloperApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>

${renderHeader('pricing', 0)}

  <main id="main-content" class="pricing-main">
    <div class="shell">
      <header class="pricing-header">
        <div class="section-marker">TRANSPARENT LICENSING</div>
        <h1>100% Free &amp; Open Source</h1>
        <p class="pricing-lead">get-fable is an independent, community-driven open source project released under the permissive MIT license.</p>
${renderFormatSwitcher('pricing', 0)}
      </header>

      <div class="pricing-card">
        <div class="pricing-card-head">
          <h2>Community Edition</h2>
          <div class="pricing-price">$0 <span>/ forever</span></div>
          <p>Full lifecycle harness, 42 canonical skills, and 32 platform integrations.</p>
        </div>

        <ul class="pricing-features">
          <li>✔ 42 Canonical Skills across 8 Packs</li>
          <li>✔ 7-Phase State Machine &amp; Evidence Gate Protocol</li>
          <li>✔ 5 Automated Lifecycle Hooks with zero runtime overhead</li>
          <li>✔ Fable Circuit Breaker (failureStreak &gt;= 2 recovery)</li>
          <li>✔ RedTeam Security Scanner &amp; Automated Self-Healing</li>
          <li>✔ Architecture Enforcement Engine &amp; ADR 0007 Standards</li>
          <li>✔ Multi-agent TOON protocol &amp; gRPC Worker Service</li>
          <li>✔ 100% Local-first: no tracking, no SaaS dependency</li>
        </ul>

        <div class="pricing-actions">
          <a class="action action-primary" href="https://github.com/imMamdouhaboammar/get-fable" target="_blank" rel="noreferrer">Get the Code on GitHub ↗</a>
          <a class="action action-secondary" href="./guide.html">Read the User Guide →</a>
        </div>
      </div>
    </div>
  </main>

${renderFooter(0)}
</body>
</html>`;

fs.writeFileSync(path.join(siteDir, 'pricing.html'), pricingHtml, 'utf-8');

// ==========================================
// 6. GENERATE SITEMAP, ROBOTS, LLMS.TXT, LLMS-FULL.TXT
// ==========================================
console.log('Generating SEO / GEO / AI bot assets (sitemap.xml, robots.txt, llms.txt)...');

const allUrls: { loc: string; priority: string; changefreq: string }[] = [
  { loc: 'https://get-fable.vercel.app/index.html', priority: '1.0', changefreq: 'weekly' },
  { loc: 'https://get-fable.vercel.app/skills.html', priority: '0.9', changefreq: 'weekly' },
  { loc: 'https://get-fable.vercel.app/guide.html', priority: '0.9', changefreq: 'weekly' },
  { loc: 'https://get-fable.vercel.app/workflows.html', priority: '0.9', changefreq: 'weekly' },
  { loc: 'https://get-fable.vercel.app/pricing.html', priority: '0.8', changefreq: 'monthly' },
  { loc: 'https://get-fable.vercel.app/llms.txt', priority: '0.8', changefreq: 'weekly' },
  { loc: 'https://get-fable.vercel.app/llms-full.txt', priority: '0.8', changefreq: 'weekly' },
];

for (const skill of registry.skills) {
  allUrls.push({ loc: `https://get-fable.vercel.app/skills/${skill.id}.html`, priority: '0.8', changefreq: 'weekly' });
  allUrls.push({ loc: `https://get-fable.vercel.app/skills/${skill.id}.md`, priority: '0.6', changefreq: 'weekly' });
  allUrls.push({ loc: `https://get-fable.vercel.app/skills/${skill.id}.txt`, priority: '0.5', changefreq: 'weekly' });
  allUrls.push({ loc: `https://get-fable.vercel.app/skills/${skill.id}.json`, priority: '0.5', changefreq: 'weekly' });
}

// Add markdown, txt, json for top pages
for (const p of ['index', 'skills', 'guide', 'workflows', 'pricing']) {
  allUrls.push({ loc: `https://get-fable.vercel.app/${p}.md`, priority: '0.6', changefreq: 'weekly' });
  allUrls.push({ loc: `https://get-fable.vercel.app/${p}.txt`, priority: '0.5', changefreq: 'weekly' });
  allUrls.push({ loc: `https://get-fable.vercel.app/${p}.json`, priority: '0.5', changefreq: 'weekly' });
}

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), sitemapXml, 'utf-8');

const robotsTxt = `# get-fable robots.txt
# Generative Engine Optimization (GEO) & Search Crawler Policy

User-agent: *
Allow: /
Allow: /*.html
Allow: /*.md
Allow: /*.txt
Allow: /*.json

# Allow all AI Search & Extraction Engines
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: DuckDuckBot
Allow: /

Sitemap: https://get-fable.vercel.app/sitemap.xml
`;

fs.writeFileSync(path.join(siteDir, 'robots.txt'), robotsTxt, 'utf-8');

// Build llms.txt adhering strictly to llmstxt.org standard
const llmsTxt = `# get-fable

> Evidence-driven coding lifecycle discipline and reusable Skills for AI coding agents.

get-fable improves working conditions for AI coding agents (Claude Code, Antigravity, Grok, Codex, Cursor, etc.) through persistent state machines, lifecycle hooks, 42 canonical skills, automated verification gates, and error recovery.

## Documentation & Guides
- [User Guide & Technical Documentation](https://get-fable.vercel.app/guide.html): Comprehensive lifecycle, state machine, hooks, and CLI reference.
- [Workflows & Production Prompts](https://get-fable.vercel.app/workflows.html): End-to-end multi-agent pipelines and copy-paste prompt templates.
- [Pricing & Open Source](https://get-fable.vercel.app/pricing.html): Free and open source MIT license details.
- [Skills Catalog](https://get-fable.vercel.app/skills.html): Index of all 42 canonical skills across 8 packs.

## Canonical Skills (42)
${registry.skills.map((s) => `- [${s.id}](https://get-fable.vercel.app/skills/${s.id}.html): ${s.description}`).join('\n')}

## Optional Resources
- [Full Context Bundle](https://get-fable.vercel.app/llms-full.txt): Complete documentation and skill specifications in a single text file.
- [GitHub Repository](https://github.com/imMamdouhaboammar/get-fable): Source code, tests, and lifecycle hooks.
`;

fs.writeFileSync(path.join(siteDir, 'llms.txt'), llmsTxt, 'utf-8');

// Build llms-full.txt (complete context bundle)
let fullBundle = `# get-fable Complete Knowledge Bundle

${llmsTxt}

================================================================================
USER GUIDE & SYSTEM ARCHITECTURE
================================================================================

${guideMdContent}

================================================================================
WORKFLOWS & PRODUCTION PROMPTS
================================================================================

${workflowsMdContent}

================================================================================
ALL 42 CANONICAL SKILL SPECIFICATIONS
================================================================================
`;

for (const skill of registry.skills) {
  const { body } = parseSkillMd(skill.id);
  fullBundle += `
--------------------------------------------------------------------------------
SKILL: ${skill.id} (Pack: ${skill.pack}, Phase: ${skill.phase})
--------------------------------------------------------------------------------
Description: ${skill.description}
Intents: ${skill.intents.join(', ')}
Gates: ${skill.gates.join(', ') || 'None'}

${body}
`;
}

fs.writeFileSync(path.join(siteDir, 'llms-full.txt'), fullBundle, 'utf-8');

// Build index.md, index.txt, and index.json
const indexMdContent = `# get-fable — Better working conditions for the model you already use

> **get-fable adds frontier-style execution discipline around AI coding agents with specs, persistent task state, lifecycle hooks, reusable skills, failure handling, and verification.**

The weights stay the same. The working conditions do not.

---

## 1. The Thesis: Why do frontier models feel different?
Raw model capability is part of the answer. It is not the whole answer.
A strong agent experience also depends on what happens around the model:
- How the task is framed
- What context survives between turns
- When implementation starts
- How repeated failures change behavior
- Which skills are available
- What counts as proof that the work is finished

get-fable focuses on that part: the execution environment around the model. It does not change model weights and it does not claim equivalence with Claude Fable 5, Claude Mythos 5, GPT-5.6 Sol, or any other proprietary frontier model.

---

## 2. The Difference: Same model, Different run

### Ordinary run:
1. **Vague instruction:** The task starts before success is made explicit.
2. **Context drift:** Important state lives only inside the conversation.
3. **Blind retries:** The same class of failure receives more of the same response.
4. **Looks done:** Completion is inferred from output rather than evidence.

### With get-fable:
1. **Spec before work:** Goal, approach, checks, dependencies, and decisions stay visible.
2. **Persistent task state:** The ledger keeps execution state outside the chat.
3. **Failure changes strategy:** Repeated command failures become a different problem to diagnose.
4. **Evidence before close:** Unfinished work and missing proof can block completion.

---

## 3. Six Ways to Change the Run
1. **Plan before implementation:** Turn intent into a concrete project spec before expensive execution starts.
2. **Keep task state outside the chat:** Use durable files for tasks, progress, decisions, and evidence instead of trusting conversation history alone.
3. **Carry working rules across turns:** Reintroduce active project state and execution rules when a new agent session starts.
4. **React differently when failures repeat:** Move from retrying commands to identifying the class of failure when the same path keeps breaking.
5. **Reuse skills and agent instructions:** Keep useful operating knowledge available as inspectable assets instead of recreating it in every prompt.
6. **Require evidence before completion:** Make "done" answer to unresolved tasks and observable proof, not confidence or presentation quality.

---

## 4. The Run Sequence
\`Prompt\` (intent) -> \`Spec\` (definition) -> \`Ledger\` (state) -> \`Hooks\` (gates) -> \`Work\` (execution) -> \`Verify\` (evidence)

---

## 5. Supported Ecosystem (32 Platforms)
- **Claude Code:** 5 lifecycle hooks, 42 canonical skills, project rules in CLAUDE.md.
- **Antigravity & Gemini CLI:** Plugin manifest, hooks.json triggers, and full canonical skill pack.
- **Grok Build:** Grok plugin manifest, hooks.json triggers, and canonical skills.
- **Codex & ChatGPT:** Codex plugin manifest, ChatGPT OpenAPI Custom Actions, and skills catalog.
- **Cursor & Windsurf:** Durable lifecycle rules and marketplace integration.
- **GitHub Copilot, Devin, Cline, Roo Code, OpenHands, OpenCode, Kilo Code, Aider, and more.**

---

## 6. Quickstart Commands
\`\`\`bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
bun ./bin/get-fable.js install
\`\`\`

---

## 7. The Boundaries: Inspectable Claims
- **What is implemented:** Claude Code skills and hooks, Antigravity / Gemini plugin package, Agent Kernel rules, Request proxy development utility.
- **What get-fable does not claim:** No model replacement, no universal installer, no correctness guarantee, no hardened public gateway.
- Independent community project licensed under MIT.
`;

fs.writeFileSync(path.join(siteDir, 'index.md'), indexMdContent, 'utf-8');
fs.writeFileSync(path.join(siteDir, 'index.txt'), cleanMarkdownToPlainText(indexMdContent), 'utf-8');
fs.writeFileSync(
  path.join(siteDir, 'index.json'),
  JSON.stringify(
    {
      title: 'get-fable — Better working conditions for the model you already use',
      description: 'Frontier-style execution discipline for AI coding agents with specs, persistent task state, lifecycle hooks, reusable skills, failure handling, and verification.',
      canonical_url: 'https://get-fable.vercel.app/',
      content_markdown: indexMdContent,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  ),
  'utf-8'
);

// Synchronize essential documentation and skills to public/ directory for local serve-web.js
const publicDir = path.join(repoRoot, 'public');
if (fs.existsSync(publicDir)) {
  fs.copyFileSync(path.join(siteDir, 'guide.html'), path.join(publicDir, 'docs.html'));
  fs.copyFileSync(path.join(siteDir, 'guide.html'), path.join(publicDir, 'guide.html'));
  fs.copyFileSync(path.join(siteDir, 'workflows.html'), path.join(publicDir, 'workflows.html'));
  fs.copyFileSync(path.join(siteDir, 'skills.html'), path.join(publicDir, 'skills.html'));
  fs.copyFileSync(path.join(siteDir, 'pricing.html'), path.join(publicDir, 'pricing.html'));
  fs.copyFileSync(path.join(siteDir, 'llms.txt'), path.join(publicDir, 'llms.txt'));
  fs.copyFileSync(path.join(siteDir, 'llms-full.txt'), path.join(publicDir, 'llms-full.txt'));
  fs.copyFileSync(path.join(siteDir, 'sitemap.xml'), path.join(publicDir, 'sitemap.xml'));
  fs.copyFileSync(path.join(siteDir, 'robots.txt'), path.join(publicDir, 'robots.txt'));

  const publicSkillsDir = path.join(publicDir, 'skills');
  if (!fs.existsSync(publicSkillsDir)) {
    fs.mkdirSync(publicSkillsDir, { recursive: true });
  }
  for (const skill of registry.skills) {
    fs.copyFileSync(path.join(siteDir, 'skills', `${skill.id}.html`), path.join(publicSkillsDir, `${skill.id}.html`));
    fs.copyFileSync(path.join(siteDir, 'skills', `${skill.id}.md`), path.join(publicSkillsDir, `${skill.id}.md`));
    fs.copyFileSync(path.join(siteDir, 'skills', `${skill.id}.txt`), path.join(publicSkillsDir, `${skill.id}.txt`));
    fs.copyFileSync(path.join(siteDir, 'skills', `${skill.id}.json`), path.join(publicSkillsDir, `${skill.id}.json`));
  }
}

console.log('Site generation and public sync complete!');


