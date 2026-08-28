import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

export function logInfo(msg: string) {
  console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`);
}

export function logSuccess(msg: string) {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
}

export function logWarn(msg: string) {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}

export function logError(msg: string) {
  console.error(`${colors.red}✖ ${msg}${colors.reset}`);
}

export function logHeader(msg: string) {
  console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`);
}

export function getClaudeDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

export function getGeminiConfigDir(): string {
  return process.env.FABLE_GEMINI_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'config');
}

export function getAgentKernelDir(): string {
  return process.env.FABLE_AGENT_KERNEL_DIR || path.join(os.homedir(), '.agent-kernel');
}

export function getCodexDir(): string {
  return process.env.FABLE_CODEX_CONFIG_DIR || path.join(os.homedir(), '.codex');
}

export function getCursorDir(): string {
  return process.env.FABLE_CURSOR_CONFIG_DIR || path.join(os.homedir(), '.cursor');
}

export function getOpenCodeDir(): string {
  return process.env.FABLE_OPENCODE_CONFIG_DIR || path.join(os.homedir(), '.opencode');
}

export function getKimiDir(): string {
  return process.env.FABLE_KIMI_CONFIG_DIR || path.join(os.homedir(), '.kimi');
}

export function getDeepSeekDir(): string {
  return process.env.FABLE_DEEPSEEK_CONFIG_DIR || path.join(os.homedir(), '.deepseek');
}

export function getKiroDir(): string {
  return process.env.FABLE_KIRO_CONFIG_DIR || path.join(os.homedir(), '.kiro');
}

export function getPiDir(): string {
  return process.env.FABLE_PI_CONFIG_DIR || path.join(os.homedir(), '.pi');
}

export function getGrokDir(): string {
  return process.env.FABLE_GROK_CONFIG_DIR || path.join(os.homedir(), '.grok');
}

export function getCopilotDir(): string {
  return process.env.FABLE_COPILOT_CONFIG_DIR || path.join(os.homedir(), '.copilot');
}

export function getDevinDir(): string {
  return process.env.FABLE_DEVIN_CONFIG_DIR || path.join(os.homedir(), '.devin');
}

export function getWindsurfDir(): string {
  return process.env.FABLE_WINDSURF_CONFIG_DIR || path.join(os.homedir(), '.codeium', 'windsurf');
}

export function getReplitDir(): string {
  return process.env.FABLE_REPLIT_CONFIG_DIR || path.join(os.homedir(), '.replit');
}

export function getAmazonQDir(): string {
  return process.env.FABLE_AMAZONQ_CONFIG_DIR || path.join(os.homedir(), '.aws', 'amazon-q');
}

export function getTraeDir(): string {
  return process.env.FABLE_TRAE_CONFIG_DIR || path.join(os.homedir(), '.trae');
}

export function getWarpDir(): string {
  return process.env.FABLE_WARP_CONFIG_DIR || path.join(os.homedir(), '.warp');
}

export function getAtlarixDir(): string {
  return process.env.FABLE_ATLARIX_CONFIG_DIR || path.join(os.homedir(), '.atlarix');
}

export function getVellumDir(): string {
  return process.env.FABLE_VELLUM_CONFIG_DIR || path.join(os.homedir(), '.vellum');
}

export function getCodegenDir(): string {
  return process.env.FABLE_CODEGEN_CONFIG_DIR || path.join(os.homedir(), '.codegen');
}

export function getMuseDir(): string {
  return process.env.FABLE_MUSE_CONFIG_DIR || path.join(os.homedir(), '.muse');
}

export function getJunieDir(): string {
  return process.env.FABLE_JUNIE_CONFIG_DIR || path.join(os.homedir(), '.junie');
}

export function getQodoDir(): string {
  return process.env.FABLE_QODO_CONFIG_DIR || path.join(os.homedir(), '.qodo');
}

export function getRooDir(): string {
  return process.env.FABLE_ROO_CONFIG_DIR || path.join(os.homedir(), '.roo');
}

export function getAiderDir(): string {
  return process.env.FABLE_AIDER_CONFIG_DIR || path.join(os.homedir(), '.aider');
}

export function getClineDir(): string {
  return process.env.FABLE_CLINE_CONFIG_DIR || path.join(os.homedir(), '.cline');
}

export function getOpenHandsDir(): string {
  return process.env.FABLE_OPENHANDS_CONFIG_DIR || path.join(os.homedir(), '.openhands');
}

export function getContinueDir(): string {
  return process.env.FABLE_CONTINUE_CONFIG_DIR || path.join(os.homedir(), '.continue');
}

export function getKiloDir(): string {
  return process.env.FABLE_KILO_CONFIG_DIR || path.join(os.homedir(), '.kilo');
}

export function getPlandexDir(): string {
  return process.env.FABLE_PLANDEX_CONFIG_DIR || path.join(os.homedir(), '.plandex');
}

export function getAutoGPTDir(): string {
  return process.env.FABLE_AUTOGPT_CONFIG_DIR || path.join(os.homedir(), '.autogpt');
}

export function getHermesDir(): string {
  return process.env.FABLE_HERMES_CONFIG_DIR || path.join(os.homedir(), '.hermes');
}


export function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
      continue;
    }

    if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function replaceTempFileSync(tempPath: string, filePath: string, mode: number) {
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'EACCES') {
      throw error;
    }

    fs.copyFileSync(tempPath, filePath);
    fs.unlinkSync(tempPath);
  }

  fs.chmodSync(filePath, mode);
}

export function atomicWriteFileSync(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const mode = fs.existsSync(filePath) ? fs.statSync(filePath).mode & 0o777 : 0o600;
  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  try {
    fs.writeFileSync(tempPath, content, { encoding: 'utf-8', mode });
    replaceTempFileSync(tempPath, filePath, mode);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
    throw error;
  }
}

export function mergeJsonFile(
  filePath: string,
  updater: (existing: Record<string, unknown>) => Record<string, unknown>
) {
  let existing: Record<string, unknown> = {};

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('root value must be a JSON object');
      }
      existing = parsed as Record<string, unknown>;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Refusing to update invalid JSON file ${filePath}: ${reason}`);
    }
  }

  const updated = updater(existing);
  if (!updated || typeof updated !== 'object' || Array.isArray(updated)) {
    throw new Error(`JSON updater for ${filePath} must return an object`);
  }

  atomicWriteFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`);
}
