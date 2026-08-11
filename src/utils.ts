import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Terminal formatting colors
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
  console.log(`${colors.red}✖ ${msg}${colors.reset}`);
}

export function logHeader(msg: string) {
  console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`);
}

export function getClaudeDir(): string {
  if (process.env.CLAUDE_CONFIG_DIR) {
    return process.env.CLAUDE_CONFIG_DIR;
  }
  return path.join(os.homedir(), '.claude');
}

export function getGeminiConfigDir(): string {
  return path.join(os.homedir(), '.gemini', 'config');
}

export function getAgentKernelDir(): string {
  return path.join(os.homedir(), '.agent-kernel');
}

export function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function mergeJsonFile(filePath: string, updater: (existing: any) => any) {
  let existing: any = {};
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      existing = {};
    }
  }
  const updated = updater(existing);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
}
