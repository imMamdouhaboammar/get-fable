import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { atomicWriteFileSync, logInfo, logSuccess, logWarn, logError } from '../utils.js';
import type { ReflexMode } from '../core/reflex/types.js';

export interface JevEnvSetupOptions {
  targetDir?: string;
  apiKey?: string;
  reflexMode?: ReflexMode;
  reflexModel?: string;
  interactive?: boolean;
  forcePrompt?: boolean;
  useEnvFallback?: boolean;
  silent?: boolean;
  promptFn?: (question: string) => Promise<string> | string;
}

export interface JevEnvSetupResult {
  configured: boolean;
  status: 'written' | 'updated' | 'already_configured' | 'skipped' | 'invalid';
  envPath: string;
  gitignoreUpdated: boolean;
  message: string;
}

const PLACEHOLDER_KEYS = new Set([
  '',
  'your_typesafe_api_key_here',
  '<secret>',
  '<your_typesafe_api_key>',
  'changeme',
  'replace_me',
  'todo',
]);

/**
 * Checks whether an API key string is empty or a template placeholder.
 */
export function isPlaceholderApiKey(value: string | undefined | null): boolean {
  if (!value) return true;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '').trim();
  if (!trimmed) return true;
  return PLACEHOLDER_KEYS.has(trimmed.toLowerCase());
}

/**
 * Sanitizes and validates an API key value before writing to .env.
 * Rejects control characters and newlines to prevent .env injection.
 */
export function sanitizeEnvValue(raw: string): string {
  const trimmed = raw.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1).trim()
      : trimmed;

  if (/[\r\n\0]/.test(unquoted)) {
    throw new Error('Invalid API key: newline or null characters are not permitted in .env values');
  }

  return unquoted;
}

/**
 * Detects whether the current process can safely prompt the user interactively on TTY.
 * Automatically returns false in CI, automated test runners, or non-TTY pipes.
 */
export function isInteractivePromptEnvironment(): boolean {
  if (process.env.FABLE_NO_INTERACTIVE === '1' || process.env.FABLE_NO_INTERACTIVE === 'true') {
    return false;
  }
  if (process.env.CI === 'true' || process.env.CI === '1') {
    return false;
  }
  if (process.env.NODE_ENV === 'test' || process.env.BUN_ENV === 'test') {
    return false;
  }
  if (process.argv.some((arg) => arg === 'test' || arg.endsWith('.test.ts') || arg.endsWith('.spec.ts'))) {
    return false;
  }
  return Boolean(process.stdin?.isTTY && process.stdout?.isTTY);
}

/**
 * Asserts that a target .env path is safe to read/write (not a symlink or directory).
 */
function assertSafeEnvPath(envPath: string): void {
  const stat = fs.lstatSync(envPath, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing to read or write symlinked .env file at ${envPath}`);
  }
  if (stat.isDirectory()) {
    throw new Error(`Refusing to overwrite directory at ${envPath}`);
  }
}

/**
 * Reads TYPESAFE_API_KEY from an existing .env file in targetDir, if present and non-placeholder.
 */
export function readTypesafeApiKeyFromEnvFile(targetDir: string = process.cwd()): string | null {
  const envPath = path.join(targetDir, '.env');
  assertSafeEnvPath(envPath);
  if (!fs.existsSync(envPath)) return null;

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?TYPESAFE_API_KEY\s*=\s*(.*)\s*$/);
    if (match) {
      const rawVal = match[1].replace(/\s+#.*$/, '').trim();
      if (!isPlaceholderApiKey(rawVal)) {
        return sanitizeEnvValue(rawVal);
      }
    }
  }
  return null;
}

/**
 * Builds or updates .env content with TYPESAFE_API_KEY and Fable Reflex defaults,
 * preserving all existing unrelated environment variables and comments.
 */
export function upsertTypesafeEnvContent(
  existingContent: string,
  apiKey: string,
  options?: { reflexMode?: ReflexMode; reflexModel?: string }
): { content: string; action: 'written' | 'updated' } {
  const cleanKey = sanitizeEnvValue(apiKey);
  if (!cleanKey || isPlaceholderApiKey(cleanKey)) {
    throw new Error('A valid non-empty TYPESAFE_API_KEY is required');
  }

  const mode = options?.reflexMode || 'off';
  const model = options?.reflexModel || 'jev-latest';

  if (!existingContent.trim()) {
    const freshContent = [
      '# TypeSafe API Configuration',
      `TYPESAFE_API_KEY=${cleanKey}`,
      '',
      '# Fable Reflex (System One Intelligence Layer) Configuration',
      `FABLE_REFLEX_MODE=${mode}`,
      'FABLE_REFLEX_PROVIDER=typesafe-jev',
      `FABLE_REFLEX_MODEL=${model}`,
      'FABLE_REFLEX_TIMEOUT_MS=1200',
      'FABLE_REFLEX_MIN_MARGIN=0.20',
      'FABLE_REFLEX_TELEMETRY=local',
      '',
    ].join('\n');
    return { content: freshContent, action: 'written' };
  }

  const lines = existingContent.split(/\r?\n/);
  let keyUpdated = false;
  let modeFound = false;
  let modelFound = false;

  const updatedLines = lines.map((line) => {
    if (/^\s*(?:export\s+)?TYPESAFE_API_KEY\s*=/.test(line)) {
      keyUpdated = true;
      return `TYPESAFE_API_KEY=${cleanKey}`;
    }
    if (/^\s*(?:export\s+)?FABLE_REFLEX_MODE\s*=/.test(line)) {
      modeFound = true;
      if (options?.reflexMode) {
        return `FABLE_REFLEX_MODE=${options.reflexMode}`;
      }
    }
    if (/^\s*(?:export\s+)?FABLE_REFLEX_MODEL\s*=/.test(line)) {
      modelFound = true;
      if (options?.reflexModel) {
        return `FABLE_REFLEX_MODEL=${options.reflexModel}`;
      }
    }
    return line;
  });

  if (!keyUpdated) {
    if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1] !== '') {
      updatedLines.push('');
    }
    updatedLines.push('# TypeSafe API Configuration');
    updatedLines.push(`TYPESAFE_API_KEY=${cleanKey}`);

    if (!modeFound) {
      updatedLines.push('');
      updatedLines.push('# Fable Reflex (System One Intelligence Layer) Configuration');
      updatedLines.push(`FABLE_REFLEX_MODE=${mode}`);
      updatedLines.push('FABLE_REFLEX_PROVIDER=typesafe-jev');
      if (!modelFound) {
        updatedLines.push(`FABLE_REFLEX_MODEL=${model}`);
      }
      updatedLines.push('FABLE_REFLEX_TIMEOUT_MS=1200');
      updatedLines.push('FABLE_REFLEX_MIN_MARGIN=0.20');
      updatedLines.push('FABLE_REFLEX_TELEMETRY=local');
    }
    updatedLines.push('');
    return { content: updatedLines.join('\n'), action: 'written' };
  }

  const finalContent = updatedLines.join('\n').endsWith('\n')
    ? updatedLines.join('\n')
    : `${updatedLines.join('\n')}\n`;

  return { content: finalContent, action: 'updated' };
}

/**
 * Ensures .env is listed in targetDir/.gitignore if a .gitignore file exists,
 * protecting credentials from accidental commits.
 */
export function ensureEnvIgnoredInGitignore(targetDir: string): boolean {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const stat = fs.lstatSync(gitignorePath, { throwIfNoEntry: false });
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    return false;
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  if (lines.includes('.env') || lines.includes('.env*')) {
    return false;
  }

  const prefix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  atomicWriteFileSync(gitignorePath, `${content}${prefix}.env\n`);
  return true;
}

/**
 * Writes or updates TYPESAFE_API_KEY in targetDir/.env with 0o600 permissions.
 * Never logs or exposes the raw secret value.
 */
export function writeTypesafeJevEnv(options: {
  targetDir?: string;
  apiKey: string;
  reflexMode?: ReflexMode;
  reflexModel?: string;
  silent?: boolean;
}): JevEnvSetupResult {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const envPath = path.join(targetDir, '.env');
  assertSafeEnvPath(envPath);

  let cleanKey: string;
  try {
    cleanKey = sanitizeEnvValue(options.apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!options.silent) logError(message);
    return {
      configured: false,
      status: 'invalid',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  if (isPlaceholderApiKey(cleanKey)) {
    const message = 'Provided TYPESAFE_API_KEY is empty or a placeholder.';
    if (!options.silent) logWarn(message);
    return {
      configured: false,
      status: 'invalid',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const existingContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const { content, action } = upsertTypesafeEnvContent(existingContent, cleanKey, {
    reflexMode: options.reflexMode,
    reflexModel: options.reflexModel,
  });

  atomicWriteFileSync(envPath, content);
  try {
    fs.chmodSync(envPath, 0o600);
  } catch {
    // Best-effort file mode on non-POSIX platforms
  }

  process.env.TYPESAFE_API_KEY = cleanKey;
  if (options.reflexMode) {
    process.env.FABLE_REFLEX_MODE = options.reflexMode;
  }
  if (options.reflexModel) {
    process.env.FABLE_REFLEX_MODEL = options.reflexModel;
  }

  const gitignoreUpdated = ensureEnvIgnoredInGitignore(targetDir);
  const message =
    action === 'updated'
      ? `Updated TYPESAFE_API_KEY in ${envPath}`
      : `Created/configured TYPESAFE_API_KEY in ${envPath}`;

  if (!options.silent) {
    logSuccess(message);
    if (gitignoreUpdated) {
      logInfo('Added .env to .gitignore to protect credentials');
    }
  }

  return {
    configured: true,
    status: action,
    envPath,
    gitignoreUpdated,
    message,
  };
}

/**
 * Prompts the user asynchronously on the terminal for their TypeSafe Jev API key.
 */
export async function promptForTypesafeApiKey(
  question: string = 'Enter your TypeSafe Jev API Key (TYPESAFE_API_KEY) [press Enter to skip]: '
): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompts the user synchronously on the terminal for their TypeSafe Jev API key.
 * Used when called from synchronous installer workflows.
 */
export function promptForTypesafeApiKeySync(
  question: string = 'Enter your TypeSafe Jev API Key (TYPESAFE_API_KEY) [press Enter to skip]: '
): string {
  process.stdout.write(question);
  const buf = Buffer.alloc(1024);
  let output = '';

  let fd = 0;
  let openedTty = false;
  try {
    if (!process.stdin.isTTY && fs.existsSync('/dev/tty')) {
      fd = fs.openSync('/dev/tty', 'rs');
      openedTty = true;
    }
    while (true) {
      const bytesRead = fs.readSync(fd, buf, 0, 1, null);
      if (bytesRead === 0) break;
      const char = buf.toString('utf-8', 0, bytesRead);
      if (char === '\n') break;
      if (char !== '\r') output += char;
    }
  } catch {
    return '';
  } finally {
    if (openedTty) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }

  return output.trim();
}

/**
 * Synchronous installer workflow that ensures TYPESAFE_API_KEY is configured in .env.
 * Prompts the user if running interactively or if a custom promptFn is supplied.
 */
export function setupTypesafeJevEnvSync(options: JevEnvSetupOptions = {}): JevEnvSetupResult {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const envPath = path.join(targetDir, '.env');
  assertSafeEnvPath(envPath);

  if (options.apiKey !== undefined) {
    return writeTypesafeJevEnv({
      targetDir,
      apiKey: options.apiKey,
      reflexMode: options.reflexMode,
      reflexModel: options.reflexModel,
      silent: options.silent,
    });
  }

  const existingKey = readTypesafeApiKeyFromEnvFile(targetDir);
  if (existingKey && !options.forcePrompt) {
    const message = `TYPESAFE_API_KEY is already configured in ${envPath}`;
    if (!options.silent) {
      logSuccess(message);
    }
    return {
      configured: true,
      status: 'already_configured',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  const canPrompt =
    typeof options.promptFn === 'function' ||
    (options.interactive !== false && isInteractivePromptEnvironment());

  if (!canPrompt) {
    const envVarKey = options.useEnvFallback ? process.env.TYPESAFE_API_KEY : undefined;
    if (envVarKey && !isPlaceholderApiKey(envVarKey)) {
      return writeTypesafeJevEnv({
        targetDir,
        apiKey: envVarKey,
        reflexMode: options.reflexMode,
        reflexModel: options.reflexModel,
        silent: options.silent,
      });
    }

    const message = 'Skipped TYPESAFE_API_KEY prompt (non-interactive environment).';
    return {
      configured: false,
      status: 'skipped',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  if (!options.silent) {
    logInfo('--- TypeSafe Jev API Configuration (.env) ---');
  }
  const question = existingKey
    ? 'Enter a new TypeSafe Jev API Key (TYPESAFE_API_KEY) [press Enter to keep existing]: '
    : 'Enter your TypeSafe Jev API Key (TYPESAFE_API_KEY) [press Enter to skip]: ';

  const rawAnswer = options.promptFn ? options.promptFn(question) : promptForTypesafeApiKeySync(question);
  if (typeof rawAnswer !== 'string') {
    throw new Error('setupTypesafeJevEnvSync requires a synchronous promptFn. Use setupTypesafeJevEnv for async.');
  }

  const trimmed = rawAnswer.trim();
  if (!trimmed) {
    if (existingKey) {
      const message = `Kept existing TYPESAFE_API_KEY in ${envPath}`;
      if (!options.silent) logInfo(message);
      return {
        configured: true,
        status: 'already_configured',
        envPath,
        gitignoreUpdated: false,
        message,
      };
    }
    const message =
      'Skipped TYPESAFE_API_KEY setup. Run "get-fable install jev" or "get-fable reflex setup" anytime to configure .env.';
    if (!options.silent) logInfo(message);
    return {
      configured: false,
      status: 'skipped',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  return writeTypesafeJevEnv({
    targetDir,
    apiKey: trimmed,
    reflexMode: options.reflexMode,
    reflexModel: options.reflexModel,
    silent: options.silent,
  });
}

/**
 * Asynchronous installer workflow that prompts for TYPESAFE_API_KEY and writes it to .env.
 */
export async function setupTypesafeJevEnv(options: JevEnvSetupOptions = {}): Promise<JevEnvSetupResult> {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const envPath = path.join(targetDir, '.env');
  assertSafeEnvPath(envPath);

  if (options.apiKey !== undefined) {
    return writeTypesafeJevEnv({
      targetDir,
      apiKey: options.apiKey,
      reflexMode: options.reflexMode,
      reflexModel: options.reflexModel,
      silent: options.silent,
    });
  }

  const existingKey = readTypesafeApiKeyFromEnvFile(targetDir);
  if (existingKey && !options.forcePrompt) {
    const message = `TYPESAFE_API_KEY is already configured in ${envPath}`;
    if (!options.silent) {
      logSuccess(message);
    }
    return {
      configured: true,
      status: 'already_configured',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  const canPrompt =
    typeof options.promptFn === 'function' ||
    (options.interactive !== false && isInteractivePromptEnvironment());

  if (!canPrompt) {
    const envVarKey = options.useEnvFallback ? process.env.TYPESAFE_API_KEY : undefined;
    if (envVarKey && !isPlaceholderApiKey(envVarKey)) {
      return writeTypesafeJevEnv({
        targetDir,
        apiKey: envVarKey,
        reflexMode: options.reflexMode,
        reflexModel: options.reflexModel,
        silent: options.silent,
      });
    }

    const message = 'Skipped TYPESAFE_API_KEY prompt (non-interactive environment).';
    return {
      configured: false,
      status: 'skipped',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  if (!options.silent) {
    logInfo('--- TypeSafe Jev API Configuration (.env) ---');
  }
  const question = existingKey
    ? 'Enter a new TypeSafe Jev API Key (TYPESAFE_API_KEY) [press Enter to keep existing]: '
    : 'Enter your TypeSafe Jev API Key (TYPESAFE_API_KEY) [press Enter to skip]: ';

  const rawAnswer = options.promptFn ? await options.promptFn(question) : await promptForTypesafeApiKey(question);
  const trimmed = rawAnswer.trim();

  if (!trimmed) {
    if (existingKey) {
      const message = `Kept existing TYPESAFE_API_KEY in ${envPath}`;
      if (!options.silent) logInfo(message);
      return {
        configured: true,
        status: 'already_configured',
        envPath,
        gitignoreUpdated: false,
        message,
      };
    }
    const message =
      'Skipped TYPESAFE_API_KEY setup. Run "get-fable install jev" or "get-fable reflex setup" anytime to configure .env.';
    if (!options.silent) logInfo(message);
    return {
      configured: false,
      status: 'skipped',
      envPath,
      gitignoreUpdated: false,
      message,
    };
  }

  return writeTypesafeJevEnv({
    targetDir,
    apiKey: trimmed,
    reflexMode: options.reflexMode,
    reflexModel: options.reflexModel,
    silent: options.silent,
  });
}
