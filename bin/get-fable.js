#!/usr/bin/env bun
import { getPackageVersion, main } from '../src/cli.ts';
import { getRepoRootDir } from '../src/installer.ts';
import { runUpdateCli } from '../src/core/update/cli-command.ts';
import {
  runDefaultAnnouncementsCli,
  runDefaultPassiveAnnouncements,
  runDefaultPassiveUpdateAwareness,
} from '../src/core/update/passive-runtime.ts';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const command = args[0];

const nativeReleasePath = path.resolve(import.meta.dir, '..', 'target', 'release', 'get-fable-native');
if (fs.existsSync(nativeReleasePath)) {
  if (command === 'native') {
    try {
      execFileSync(nativeReleasePath, args.slice(1), { stdio: 'inherit' });
      process.exit(0);
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
        process.exit(err.status);
      }
    }
  } else if (process.env.FABLE_NATIVE === '1' && ['route', 'state', 'mutation', 'evidence', 'card'].includes(command)) {
    try {
      execFileSync(nativeReleasePath, args, { stdio: 'inherit' });
      process.exit(0);
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
        process.exit(err.status);
      }
    }
  }
}

if (command === 'update') {
  try {
    process.exitCode = await runUpdateCli(args.slice(1), {
      currentVersion: getPackageVersion(),
      repoRoot: getRepoRootDir(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
} else if (command === 'announcements') {
  process.exitCode = await runDefaultAnnouncementsCli(args.slice(1), getPackageVersion());
} else if (command === 'redteam' || command === 'pentest') {
  const { handleRedTeamCli } = await import('../src/core/redteam/cli.ts');
  process.exitCode = await handleRedTeamCli(args.slice(1));
} else {
  await main();

  const primarySucceeded = process.exitCode === undefined || Number(process.exitCode) === 0;
  if (primarySucceeded) {
    const passiveContext = {
      currentVersion: getPackageVersion(),
      command: command ?? 'help',
      autoCheck: true,
      isCI: Boolean(process.env.CI),
      isTTY: process.stdout.isTTY === true && process.stderr.isTTY === true,
      jsonMode: args.includes('--json'),
      jsonV1Mode: args.includes('--json-v1'),
    };

    try {
      await runDefaultPassiveUpdateAwareness(passiveContext);
      await runDefaultPassiveAnnouncements(passiveContext);
    } catch {
      // Passive awareness cannot change the result of the user's primary command.
    }
  }
}
