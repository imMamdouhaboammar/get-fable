#!/usr/bin/env bun
import { getPackageVersion, main } from '../src/cli.ts';
import { getRepoRootDir } from '../src/installer.ts';
import { runUpdateCli } from '../src/core/update/cli-command.ts';

const command = process.argv[2];

if (command === 'update') {
  try {
    process.exitCode = await runUpdateCli(process.argv.slice(3), {
      currentVersion: getPackageVersion(),
      repoRoot: getRepoRootDir(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
} else {
  await main();
}
