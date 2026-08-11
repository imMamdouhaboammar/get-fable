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
