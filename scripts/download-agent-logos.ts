import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const assetsLogosDir = path.join(root, 'assets', 'logos');
const siteLogosDir = path.join(root, 'site', 'assets', 'logos');

if (!fs.existsSync(assetsLogosDir)) fs.mkdirSync(assetsLogosDir, { recursive: true });
if (!fs.existsSync(siteLogosDir)) fs.mkdirSync(siteLogosDir, { recursive: true });

const LOBE_BASE = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons';
const GITHUB_LOBE_BASE = 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-svg/icons';
const SIMPLE_BASE = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons';

// Primary mappings to exact @lobehub/icons IDs
const LOBE_ICONS: Array<{ filename: string; lobeId: string; hasColor?: boolean }> = [
  { filename: 'claude.svg', lobeId: 'claude', hasColor: true },
  { filename: 'anthropic.svg', lobeId: 'anthropic', hasColor: true },
  { filename: 'openai.svg', lobeId: 'openai', hasColor: true },
  { filename: 'gemini.svg', lobeId: 'gemini', hasColor: true },
  { filename: 'google.svg', lobeId: 'google', hasColor: true },
  { filename: 'googlecloud.svg', lobeId: 'googlecloud', hasColor: true },
  { filename: 'vertexai.svg', lobeId: 'vertexai', hasColor: true },
  { filename: 'cursor.svg', lobeId: 'cursor', hasColor: true },
  { filename: 'deepseek.svg', lobeId: 'deepseek', hasColor: true },
  { filename: 'moonshot.svg', lobeId: 'moonshot', hasColor: true },
  { filename: 'moonshot-kimi.svg', lobeId: 'moonshot', hasColor: true },
  { filename: 'kimi.svg', lobeId: 'moonshot', hasColor: true },
  { filename: 'copilot.svg', lobeId: 'copilot', hasColor: true },
  { filename: 'githubcopilot.svg', lobeId: 'githubcopilot', hasColor: true },
  { filename: 'github.svg', lobeId: 'github', hasColor: false },
  { filename: 'windsurf.svg', lobeId: 'windsurf', hasColor: false },
  { filename: 'xai.svg', lobeId: 'xai', hasColor: true },
  { filename: 'grok.svg', lobeId: 'xai', hasColor: true },
  { filename: 'bytedance.svg', lobeId: 'bytedance', hasColor: true },
  { filename: 'doubao.svg', lobeId: 'doubao', hasColor: true },
  { filename: 'aws.svg', lobeId: 'aws', hasColor: true },
  { filename: 'bedrock.svg', lobeId: 'bedrock', hasColor: true },
  { filename: 'azure.svg', lobeId: 'azure', hasColor: true },
  { filename: 'microsoft.svg', lobeId: 'microsoft', hasColor: true },
  { filename: 'nousresearch.svg', lobeId: 'nousresearch', hasColor: true },
  { filename: 'hermes.svg', lobeId: 'nousresearch', hasColor: true },
  { filename: 'mistral.svg', lobeId: 'mistral', hasColor: true },
  { filename: 'perplexity.svg', lobeId: 'perplexity', hasColor: true },
  { filename: 'cohere.svg', lobeId: 'cohere', hasColor: true },
  { filename: 'groq.svg', lobeId: 'groq', hasColor: true },
  { filename: 'ollama.svg', lobeId: 'ollama', hasColor: true },
  { filename: 'together.svg', lobeId: 'together', hasColor: true },
  { filename: 'togetherai.svg', lobeId: 'togetherai', hasColor: true },
  { filename: 'openrouter.svg', lobeId: 'openrouter', hasColor: true },
  { filename: 'huggingface.svg', lobeId: 'huggingface', hasColor: true },
  { filename: 'meta.svg', lobeId: 'meta', hasColor: true },
  { filename: 'qwen.svg', lobeId: 'qwen', hasColor: true },
  { filename: 'alibaba.svg', lobeId: 'alibaba', hasColor: true },
  { filename: 'alibabacloud.svg', lobeId: 'alibabacloud', hasColor: true },
  { filename: 'baichuan.svg', lobeId: 'baichuan', hasColor: true },
  { filename: 'minimax.svg', lobeId: 'minimax', hasColor: true },
  { filename: 'stepfun.svg', lobeId: 'stepfun', hasColor: true },
  { filename: 'zhipu.svg', lobeId: 'zhipu', hasColor: true },
  { filename: 'sensenova.svg', lobeId: 'sensenova', hasColor: true },
  { filename: 'spark.svg', lobeId: 'spark', hasColor: true },
  { filename: 'iflytekcloud.svg', lobeId: 'iflytekcloud', hasColor: true },
  { filename: 'v0.svg', lobeId: 'v0', hasColor: false },
  { filename: 'vercel.svg', lobeId: 'vercel', hasColor: false },
  { filename: 'cloudflare.svg', lobeId: 'cloudflare', hasColor: true },
  { filename: 'workersai.svg', lobeId: 'workersai', hasColor: true },
  { filename: 'replicate.svg', lobeId: 'replicate', hasColor: true },
  { filename: 'fireworks.svg', lobeId: 'fireworks', hasColor: true },
  { filename: 'fireworksai.svg', lobeId: 'fireworksai', hasColor: true },
  { filename: 'cerebras.svg', lobeId: 'cerebras', hasColor: true },
  { filename: 'sambanova.svg', lobeId: 'sambanova', hasColor: true },
  { filename: 'upstage.svg', lobeId: 'upstage', hasColor: true },
  { filename: 'lobehub.svg', lobeId: 'lobehub', hasColor: true },
  { filename: 'lmstudio.svg', lobeId: 'lmstudio', hasColor: false },
  { filename: 'comfyui.svg', lobeId: 'comfyui', hasColor: true },
  { filename: 'nvidia.svg', lobeId: 'nvidia', hasColor: true },
  { filename: 'apple.svg', lobeId: 'apple', hasColor: false },
  { filename: 'deepmind.svg', lobeId: 'deepmind', hasColor: true },
  { filename: 'ai21.svg', lobeId: 'ai21', hasColor: true },
  { filename: 'fal.svg', lobeId: 'fal', hasColor: true },
  { filename: 'stability.svg', lobeId: 'stability', hasColor: true },
  { filename: 'novita.svg', lobeId: 'novita', hasColor: true }
];

// Additional IDE & Platform tools from Simple Icons & Official Repos
const EXTERNAL_ICONS: Array<{ filename: string; url: string }> = [
  { filename: 'vscode.svg', url: `${SIMPLE_BASE}/visualstudiocode.svg` },
  { filename: 'zed.svg', url: `${SIMPLE_BASE}/zedindustries.svg` },
  { filename: 'replit.svg', url: `${SIMPLE_BASE}/replit.svg` },
  { filename: 'warp.svg', url: `${SIMPLE_BASE}/warp.svg` },
  { filename: 'jetbrains.svg', url: `${SIMPLE_BASE}/jetbrains.svg` }
];

async function fetchSvg(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<svg') && !text.includes('Cannot GET')) {
        return text;
      }
    }
  } catch {}
  return null;
}

function saveSvg(filename: string, content: string) {
  fs.writeFileSync(path.join(assetsLogosDir, filename), content, 'utf-8');
  fs.writeFileSync(path.join(siteLogosDir, filename), content, 'utf-8');
  console.log(`✔ Saved: ${filename}`);
}

console.log('Fetching official @lobehub/icons SVG assets...');

for (const item of LOBE_ICONS) {
  // Try unpkg first, fallback to github raw
  const primaryUrl = `${LOBE_BASE}/${item.lobeId}.svg`;
  const githubUrl = `${GITHUB_LOBE_BASE}/${item.lobeId}.svg`;
  
  let svg = await fetchSvg(primaryUrl) || await fetchSvg(githubUrl);
  if (svg) {
    saveSvg(item.filename, svg);
  } else {
    console.warn(`✖ Failed base: ${item.lobeId}.svg`);
  }

  if (item.hasColor) {
    const colorFilename = item.filename.replace('.svg', '-color.svg');
    const colorUrl = `${LOBE_BASE}/${item.lobeId}-color.svg`;
    const githubColorUrl = `${GITHUB_LOBE_BASE}/${item.lobeId}-color.svg`;
    const colorSvg = await fetchSvg(colorUrl) || await fetchSvg(githubColorUrl);
    if (colorSvg) {
      saveSvg(colorFilename, colorSvg);
    }
  }
}

for (const item of EXTERNAL_ICONS) {
  const svg = await fetchSvg(item.url);
  if (svg) {
    saveSvg(item.filename, svg);
  }
}

console.log('\n🎉 Finished updating all SVG logos from @lobehub/icons!');
