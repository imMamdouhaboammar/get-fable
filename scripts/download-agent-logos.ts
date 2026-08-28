import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const assetsLogosDir = path.join(root, 'assets', 'logos');
const siteLogosDir = path.join(root, 'site', 'assets', 'logos');

if (!fs.existsSync(assetsLogosDir)) fs.mkdirSync(assetsLogosDir, { recursive: true });
if (!fs.existsSync(siteLogosDir)) fs.mkdirSync(siteLogosDir, { recursive: true });

const LOBE_BASE = 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-svg/icons';
const SIMPLE_BASE = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons';

const ICONS_TO_FETCH: Array<{ filename: string; url: string; fallbackUrl?: string }> = [
  { filename: 'claude.svg', url: `${LOBE_BASE}/claude.svg` },
  { filename: 'claude-color.svg', url: `${LOBE_BASE}/claude-color.svg` },
  { filename: 'anthropic.svg', url: `${LOBE_BASE}/anthropic.svg` },
  { filename: 'openai.svg', url: `${LOBE_BASE}/openai.svg` },
  { filename: 'gemini.svg', url: `${LOBE_BASE}/gemini.svg` },
  { filename: 'gemini-color.svg', url: `${LOBE_BASE}/gemini-color.svg` },
  { filename: 'google.svg', url: `${LOBE_BASE}/google.svg` },
  { filename: 'google-color.svg', url: `${LOBE_BASE}/google-color.svg` },
  { filename: 'cursor.svg', url: `${LOBE_BASE}/cursor.svg` },
  { filename: 'deepseek.svg', url: `${LOBE_BASE}/deepseek.svg` },
  { filename: 'deepseek-color.svg', url: `${LOBE_BASE}/deepseek-color.svg` },
  { filename: 'moonshot-kimi.svg', url: `${LOBE_BASE}/moonshot.svg` },
  { filename: 'copilot.svg', url: `${LOBE_BASE}/copilot.svg` },
  { filename: 'copilot-color.svg', url: `${LOBE_BASE}/copilot-color.svg` },
  { filename: 'github.svg', url: `${LOBE_BASE}/github.svg` },
  { filename: 'windsurf.svg', url: `${LOBE_BASE}/windsurf.svg` },
  { filename: 'vscode.svg', url: `${SIMPLE_BASE}/visualstudiocode.svg` },
  { filename: 'zed.svg', url: `${SIMPLE_BASE}/zedindustries.svg` },
  { filename: 'perplexity.svg', url: `${LOBE_BASE}/perplexity.svg` },
  { filename: 'perplexity-color.svg', url: `${LOBE_BASE}/perplexity-color.svg` },
  { filename: 'mistral.svg', url: `${LOBE_BASE}/mistral.svg` },
  { filename: 'mistral-color.svg', url: `${LOBE_BASE}/mistral-color.svg` },
  { filename: 'groq.svg', url: `${LOBE_BASE}/groq.svg` },
  { filename: 'ollama.svg', url: `${LOBE_BASE}/ollama.svg` },
  { filename: 'together.svg', url: `${LOBE_BASE}/together.svg` },
  { filename: 'together-color.svg', url: `${LOBE_BASE}/together-color.svg` },
  { filename: 'openrouter.svg', url: `${LOBE_BASE}/openrouter.svg` },
  { filename: 'openrouter-color.svg', url: `${LOBE_BASE}/openrouter-color.svg` }
];

// Fallback / custom branded SVGs for OpenCode, Kiro, Pi Code
const CUSTOM_SVGS: Record<string, string> = {
  'opencode.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" fill="#3B82F6" stroke="#2563EB"/>
  <polyline points="8 9 12 12 8 15" stroke="#FFFFFF" stroke-width="2"/>
</svg>`,
  'kiro.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#6366F1"/>
  <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" fill="#FFFFFF"/>
</svg>`,
  'pi.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <circle cx="12" cy="12" r="10" fill="#059669"/>
  <path d="M7 8h10M9 8v8M15 8v5.5a2.5 2.5 0 0 0 2.5 2.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
};

console.log('Downloading official Coding Agent & IDE SVG logos...');

for (const item of ICONS_TO_FETCH) {
  try {
    const res = await fetch(item.url);
    if (res.status === 200) {
      const svg = await res.text();
      fs.writeFileSync(path.join(assetsLogosDir, item.filename), svg, 'utf-8');
      fs.writeFileSync(path.join(siteLogosDir, item.filename), svg, 'utf-8');
      console.log(`✔ Saved: ${item.filename}`);
    } else {
      console.warn(`✖ Failed (${res.status}): ${item.url}`);
    }
  } catch (err) {
    console.error(`✖ Error downloading ${item.filename}:`, err);
  }
}

for (const [filename, svg] of Object.entries(CUSTOM_SVGS)) {
  fs.writeFileSync(path.join(assetsLogosDir, filename), svg, 'utf-8');
  fs.writeFileSync(path.join(siteLogosDir, filename), svg, 'utf-8');
  console.log(`✔ Saved custom: ${filename}`);
}

console.log('Finished saving all SVG logos.');
