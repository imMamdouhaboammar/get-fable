/**
 * CLI Command Handler for `get-fable neural-test`.
 * High-performance native Rust core neural testing and auto-arch tournament engine.
 */

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getRepoRootDir } from '../../installer.js';
import { findNeuralTestBinary } from '../../eco/native-bridge.js';

export function runNeuralTestCommand(args: string[]): number {
  const repoRoot = getRepoRootDir();
  const binary = findNeuralTestBinary(repoRoot);

  const forwardedArgs = [...args];
  const subcommands = ['scan', 'rank', 'eval', 'prune', 'doctor', 'help'];
  const firstArg = forwardedArgs[0];

  let commandArgs: string[];
  if (!firstArg) {
    commandArgs = ['doctor'];
  } else if (!subcommands.includes(firstArg) && firstArg.startsWith('-')) {
    commandArgs = ['doctor', ...forwardedArgs];
  } else {
    commandArgs = forwardedArgs;
  }

  if (binary) {
    const isGetFableNative = path.basename(binary).startsWith('get-fable-native');
    const finalArgs = isGetFableNative ? ['neural-test', ...commandArgs] : commandArgs;

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
      console.error(`Error executing native neural-test engine: ${result.error.message}`);
      return 1;
    }

    return result.status ?? 0;
  }

  // Fallback: Attempt cargo run if cargo is in PATH
  try {
    const cargoCheck = spawnSync('cargo', ['--version'], { stdio: 'ignore' });
    if (cargoCheck.status === 0) {
      const cargoArgs = ['run', '--quiet', '-p', 'fable-neural-test', '--', ...commandArgs];
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
    'Error: fable-neural-test native engine binary not found. Build it with `cargo build -p fable-neural-test`.'
  );
  return 1;
}
