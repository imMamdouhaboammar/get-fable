import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const assetsLogosDir = path.join(root, 'assets', 'logos');
const siteLogosDir = path.join(root, 'site', 'assets', 'logos');

if (!fs.existsSync(assetsLogosDir)) fs.mkdirSync(assetsLogosDir, { recursive: true });
if (!fs.existsSync(siteLogosDir)) fs.mkdirSync(siteLogosDir, { recursive: true });

const LOBE_BASE = 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-svg/icons';
const SIMPLE_BASE = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons';

const ICONS_TO_FETCH: Array<{ filename: string; url: string }> = [
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
  { filename: 'openrouter-color.svg', url: `${LOBE_BASE}/openrouter-color.svg` },
  { filename: 'grok.svg', url: `${LOBE_BASE}/grok.svg` },
  { filename: 'xai.svg', url: `${LOBE_BASE}/xai.svg` },
  { filename: 'bytedance.svg', url: `${LOBE_BASE}/bytedance.svg` },
  { filename: 'aws.svg', url: `${LOBE_BASE}/aws.svg` },
  { filename: 'bedrock.svg', url: `${LOBE_BASE}/bedrock.svg` },
  { filename: 'nousresearch.svg', url: `${LOBE_BASE}/nousresearch.svg` },
  { filename: 'replit.svg', url: `${SIMPLE_BASE}/replit.svg` },
  { filename: 'warp.svg', url: `${SIMPLE_BASE}/warp.svg` },
  { filename: 'jetbrains.svg', url: `${SIMPLE_BASE}/jetbrains.svg` }
];

// Fallback & custom branded SVGs for all agents & tools (strictly square 24x24)
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
</svg>`,
  'grok.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="5" fill="#000000"/>
  <path d="M4.5 4.5L11 12L4.5 19.5H7.5L12.5 13.8L16.5 19.5H19.5L13 10.2L19 4.5H16L11.5 9.8L8 4.5H4.5Z" fill="#FFFFFF"/>
</svg>`,
  'devin.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#0EA5E9"/>
  <circle cx="12" cy="12" r="5" fill="#FFFFFF"/>
  <path d="M12 4v4m0 8v4M4 12h4m8 0h4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
</svg>`,
  'amazonq.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#FF9900"/>
  <path d="M12 5a7 7 0 1 0 5.2 11.7l2.1 2.1a1 1 0 0 0 1.4-1.4l-2.1-2.1A7 7 0 0 0 12 5zm0 11.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5z" fill="#232F3E"/>
</svg>`,
  'trae.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#3B82F6"/>
  <path d="M7 6h10v3H7zm3 4h4v8h-4z" fill="#FFFFFF"/>
</svg>`,
  'atlarix.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#8B5CF6"/>
  <path d="M12 4L4 18h16L12 4zm0 4.5l4.5 8h-9L12 8.5z" fill="#FFFFFF"/>
</svg>`,
  'vellum.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#10B981"/>
  <path d="M6 7l6 10 6-10h-3.5L12 12.5 9.5 7H6z" fill="#FFFFFF"/>
</svg>`,
  'codegen.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#EC4899"/>
  <path d="M8 8l-4 4 4 4m8-8l4 4-4 4m-3-9l-2 10" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  'muse.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#F59E0B"/>
  <path d="M6 18V6l6 6 6-6v12" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  'junie.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#000000"/>
  <path d="M6 14a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V6h-3v8a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V6H6v8z" fill="#FC801D"/>
</svg>`,
  'qodo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#6366F1"/>
  <circle cx="12" cy="12" r="6" stroke="#FFFFFF" stroke-width="2.5"/>
  <path d="M16 16l3 3" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
  'roocode.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#A855F7"/>
  <path d="M8 6h8a4 4 0 0 1 0 8H8V6zm0 8h4l4 4H12l-4-4z" fill="#FFFFFF"/>
</svg>`,
  'aider.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#14B8A6"/>
  <path d="M12 4L5 18h3.5l1.5-3.5h4l1.5 3.5H19L12 4zm0 4.5l1.3 3h-2.6L12 8.5z" fill="#FFFFFF"/>
</svg>`,
  'cline.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#F97316"/>
  <path d="M16 8a5 5 0 1 0 0 8M8 12h8" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
  'openhands.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#3B82F6"/>
  <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
</svg>`,
  'continue.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#06B6D4"/>
  <path d="M8 7l8 5-8 5V7z" fill="#FFFFFF"/>
</svg>`,
  'kilo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#4F46E5"/>
  <path d="M7 6v12m0-6l7-6m-7 6l7 6" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  'plandex.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#2563EB"/>
  <path d="M6 6h12v3H6zm0 5h8v3H6zm0 5h10v3H6z" fill="#FFFFFF"/>
</svg>`,
  'autogpt.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#10B981"/>
  <path d="M12 4l3 6h-6l3-6zm-6 8h12l-6 8-6-8z" fill="#FFFFFF"/>
</svg>`,
  'hermes.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
  <rect width="24" height="24" rx="6" fill="#8B5CF6"/>
  <path d="M5 8c3-3 8-3 11 0l3 3-3 3c-3 3-8 3-11 0L2 11l3-3z" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="11" r="2.5" fill="#FFFFFF"/>
</svg>`
};

console.log('Downloading official Coding Agent & IDE SVG logos from @lobehub/icons & Simple Icons...');

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
  console.log(`✔ Saved custom/fallback: ${filename}`);
}

console.log('Finished saving all SVG logos.');
