/**
 * CLI Command Handler for `get-fable anti-slop`.
 * High-performance anti-slop and dirty engineering prevention.
 */

import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { getRepoRootDir } from '../../installer.js';
import { findAntiSlopBinary } from '../../eco/native-bridge.js';

export function runAntiSlopCommand(args: string[]): number {
  const repoRoot = getRepoRootDir();
  const binary = findAntiSlopBinary(repoRoot);

  const forwardedArgs = [...args];
  // If the first argument is not a subcommand (scan, check, stdin, help, -h, --help), default to "scan"
  const subcommands = ['scan', 'check', 'stdin', 'help'];
  const firstArg = forwardedArgs[0];
  const isSubcommand = firstArg && (subcommands.includes(firstArg) || firstArg.startsWith('-'));

  let commandArgs: string[];
  if (!firstArg || (!subcommands.includes(firstArg) && firstArg.startsWith('-'))) {
    commandArgs = ['scan', ...forwardedArgs];
  } else if (!subcommands.includes(firstArg)) {
    commandArgs = ['scan', ...forwardedArgs];
  } else {
    commandArgs = forwardedArgs;
  }

  if (binary) {
    const isGetFableNative = path.basename(binary).startsWith('get-fable-native');
    const finalArgs = isGetFableNative ? ['anti-slop', ...commandArgs] : commandArgs;

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
      console.error(`Error executing native anti-slop engine: ${result.error.message}`);
      return 1;
    }

    return result.status ?? 0;
  }

  // Fallback: Attempt cargo run if cargo is in PATH
  try {
    const cargoCheck = spawnSync('cargo', ['--version'], { stdio: 'ignore' });
    if (cargoCheck.status === 0) {
      const cargoArgs = ['run', '--quiet', '-p', 'fable-anti-slop', '--', ...commandArgs];
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
    'Error: fable-anti-slop native engine binary not found. Build it with `cargo build -p fable-anti-slop`.'
  );
  return 1;
}
