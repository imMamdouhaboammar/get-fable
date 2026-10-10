import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  setupTypesafeJevEnv,
  setupTypesafeJevEnvSync,
  writeTypesafeJevEnv,
  readTypesafeApiKeyFromEnvFile,
  upsertTypesafeEnvContent,
  isPlaceholderApiKey,
  sanitizeEnvValue,
  ensureEnvIgnoredInGitignore,
  initProjectFable,
} from '../src/installer.ts';
import { runCli } from '../src/cli.ts';

const tempDirs: string[] = [];
const previousApiKey = process.env.TYPESAFE_API_KEY;
const previousReflexMode = process.env.FABLE_REFLEX_MODE;

function makeTempDir(prefix: string = 'get-fable-jev-env-'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  if (previousApiKey === undefined) delete process.env.TYPESAFE_API_KEY;
  else process.env.TYPESAFE_API_KEY = previousApiKey;

  if (previousReflexMode === undefined) delete process.env.FABLE_REFLEX_MODE;
  else process.env.FABLE_REFLEX_MODE = previousReflexMode;

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('TypeSafe Jev API .env Installer Tool', () => {
  test('prompts for TYPESAFE_API_KEY and creates a new .env file with Fable Reflex defaults', async () => {
    const dir = makeTempDir();
    let askedQuestion = '';

    const result = await setupTypesafeJevEnv({
      targetDir: dir,
      silent: true,
      promptFn: (q) => {
        askedQuestion = q;
        return 'ts_live_987654321_secret';
      },
    });

    expect(askedQuestion).toContain('TYPESAFE_API_KEY');
    expect(result.configured).toBe(true);
    expect(result.status).toBe('written');
    expect(result.envPath).toBe(path.join(dir, '.env'));
    expect(result.message).not.toContain('ts_live_987654321_secret');

    const envContent = fs.readFileSync(result.envPath, 'utf-8');
    expect(envContent).toContain('TYPESAFE_API_KEY=ts_live_987654321_secret');
    expect(envContent).toContain('FABLE_REFLEX_PROVIDER=typesafe-jev');
    expect(envContent).toContain('FABLE_REFLEX_MODE=off');
    expect(readTypesafeApiKeyFromEnvFile(dir)).toBe('ts_live_987654321_secret');
    expect(process.env.TYPESAFE_API_KEY).toBe('ts_live_987654321_secret');
  });

  test('preserves unrelated variables in existing .env and replaces placeholder TYPESAFE_API_KEY', () => {
    const dir = makeTempDir();
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      [
        '# Existing App Config',
        'DATABASE_URL=postgres://localhost:5432/app',
        'TYPESAFE_API_KEY=your_typesafe_api_key_here',
        'PORT=3000',
        '',
      ].join('\n'),
      'utf-8'
    );

    const result = setupTypesafeJevEnvSync({
      targetDir: dir,
      silent: true,
      promptFn: () => 'ts_live_updated_key_42',
    });

    expect(result.configured).toBe(true);
    expect(result.status).toBe('updated');

    const updated = fs.readFileSync(envPath, 'utf-8');
    expect(updated).toContain('DATABASE_URL=postgres://localhost:5432/app');
    expect(updated).toContain('PORT=3000');
    expect(updated).toContain('TYPESAFE_API_KEY=ts_live_updated_key_42');
    expect(updated).not.toContain('your_typesafe_api_key_here');
  });

  test('appends TYPESAFE_API_KEY to an existing .env that lacks it without clobbering existing keys', () => {
    const dir = makeTempDir();
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, 'NODE_ENV=development\nCUSTOM_FLAG=true\n', 'utf-8');

    const result = writeTypesafeJevEnv({
      targetDir: dir,
      apiKey: 'ts_appended_key_777',
      reflexMode: 'shadow',
      silent: true,
    });

    expect(result.configured).toBe(true);
    expect(result.status).toBe('written');
    const content = fs.readFileSync(envPath, 'utf-8');
    expect(content).toContain('NODE_ENV=development');
    expect(content).toContain('CUSTOM_FLAG=true');
    expect(content).toContain('TYPESAFE_API_KEY=ts_appended_key_777');
    expect(content).toContain('FABLE_REFLEX_MODE=shadow');
  });

  test('skips gracefully when user presses Enter to skip prompt', () => {
    const dir = makeTempDir();
    const result = setupTypesafeJevEnvSync({
      targetDir: dir,
      silent: true,
      promptFn: () => '   ',
    });

    expect(result.configured).toBe(false);
    expect(result.status).toBe('skipped');
    expect(fs.existsSync(path.join(dir, '.env'))).toBe(false);
  });

  test('detects already configured .env and does not overwrite when forcePrompt is false', () => {
    const dir = makeTempDir();
    writeTypesafeJevEnv({
      targetDir: dir,
      apiKey: 'ts_initial_key',
      silent: true,
    });

    let promptCalled = false;
    const second = setupTypesafeJevEnvSync({
      targetDir: dir,
      silent: true,
      promptFn: () => {
        promptCalled = true;
        return 'ts_should_not_be_used';
      },
    });

    expect(promptCalled).toBe(false);
    expect(second.configured).toBe(true);
    expect(second.status).toBe('already_configured');
    expect(readTypesafeApiKeyFromEnvFile(dir)).toBe('ts_initial_key');
  });

  test('rejects newline injection and symlinked .env files', () => {
    const dir = makeTempDir();
    expect(() => sanitizeEnvValue('ts_key\nMALICIOUS_VAR=1')).toThrow('newline or null characters');
    expect(isPlaceholderApiKey('your_typesafe_api_key_here')).toBe(true);
    expect(isPlaceholderApiKey('ts_real_key')).toBe(false);

    const invalidResult = writeTypesafeJevEnv({
      targetDir: dir,
      apiKey: 'bad_key\nINJECTED=true',
      silent: true,
    });
    expect(invalidResult.configured).toBe(false);
    expect(invalidResult.status).toBe('invalid');

    if (process.platform !== 'win32') {
      const targetFile = path.join(dir, 'secret.txt');
      fs.writeFileSync(targetFile, 'secret', 'utf-8');
      fs.symlinkSync(targetFile, path.join(dir, '.env'));

      expect(() =>
        writeTypesafeJevEnv({
          targetDir: dir,
          apiKey: 'ts_valid_key',
          silent: true,
        })
      ).toThrow('Refusing to read or write symlinked .env file');
    }
  });

  test('ensures .env is added to .gitignore when .gitignore exists', () => {
    const dir = makeTempDir();
    const gitignorePath = path.join(dir, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules/\ndist/\n', 'utf-8');

    const result = writeTypesafeJevEnv({
      targetDir: dir,
      apiKey: 'ts_gitignore_test_key',
      silent: true,
    });

    expect(result.gitignoreUpdated).toBe(true);
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignoreContent.split(/\r?\n/)).toContain('.env');
    expect(ensureEnvIgnoredInGitignore(dir)).toBe(false);
  });

  test('CLI install jev, setup-jev, and init support --typesafe-api-key and --target-dir', async () => {
    const dir = makeTempDir();

    const code1 = await runCli([
      'install',
      'jev',
      '--typesafe-api-key',
      'ts_cli_install_key_1',
      '--reflex-mode',
      'shadow',
      '--target-dir',
      dir,
      '--json-v1',
    ]);
    expect(code1).toBe(0);
    expect(readTypesafeApiKeyFromEnvFile(dir)).toBe('ts_cli_install_key_1');

    const code2 = await runCli([
      'setup-jev',
      '--jev-api-key=ts_cli_setup_key_2',
      `--target-dir=${dir}`,
      '--json',
    ]);
    expect(code2).toBe(0);
    expect(readTypesafeApiKeyFromEnvFile(dir)).toBe('ts_cli_setup_key_2');

    const initDir = makeTempDir('get-fable-init-jev-');
    initProjectFable(initDir, {
      apiKey: 'ts_init_project_key_3',
      silent: true,
    });
    expect(readTypesafeApiKeyFromEnvFile(initDir)).toBe('ts_init_project_key_3');
    expect(fs.existsSync(path.join(initDir, '.fable', 'state.json'))).toBe(true);
  });
});
