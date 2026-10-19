/**
 * CLI Command Handler for `get-fable anti-churn`.
 * High-performance anti-churn and duplicate-work prevention engine.
 */

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getRepoRootDir } from '../../installer.js';
import { findAntiChurnBinary } from '../../eco/native-bridge.js';

export function runAntiChurnCommand(args: string[]): number {
  const repoRoot = getRepoRootDir();
  const binary = findAntiChurnBinary(repoRoot);

  const forwardedArgs = [...args];
  const subcommands = ['decide', 'accept', 'verify', 'check', 'self-test', 'status', 'help'];
  const firstArg = forwardedArgs[0];

  let commandArgs: string[];
  if (!firstArg) {
    commandArgs = ['status'];
  } else if (!subcommands.includes(firstArg) && firstArg.startsWith('-')) {
    commandArgs = ['status', ...forwardedArgs];
  } else {
    commandArgs = forwardedArgs;
  }

  if (binary) {
    const isGetFableNative = path.basename(binary).startsWith('get-fable-native');
    const finalArgs = isGetFableNative ? ['anti-churn', ...commandArgs] : commandArgs;

    const result = spawnSync(binary, finalArgs, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      env: process.env,
    });

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    if (result.error) {
      console.error(`Error executing native anti-churn engine: ${result.error.message}`);
      return 1;
    }

    return result.status ?? 0;
  }

  // Fallback: Attempt cargo run if cargo is in PATH
  try {
    const cargoCheck = spawnSync('cargo', ['--version'], { stdio: 'ignore' });
    if (cargoCheck.status === 0) {
      const cargoArgs = ['run', '--quiet', '-p', 'fable-anti-churn', '--', ...commandArgs];
      const result = spawnSync('cargo', cargoArgs, {
        cwd: repoRoot,
        encoding: 'utf-8',
        env: process.env,
      });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      return result.status ?? 0;
    }
  } catch {
    // Cargo not found or failed
  }

  console.error(
    'Error: fable-anti-churn native engine binary not found. Build it with `cargo build -p fable-anti-churn`.'
  );
  return 1;
}
