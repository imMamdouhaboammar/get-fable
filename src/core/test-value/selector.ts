/**
 * Feature Reconstruction: Risk-Proportional Test Selector, Blast-Radius Graph & Shard Invariant Verifier
 * Reverse-Engineered from: https://github.com/tt-a1i/test-value
 * Evidence Digest:
 *   - references/audit.md: sha256:982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757 (Lines 25-45)
 *   - SKILL.md: sha256:a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e (Lines 45, 60-66)
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  BlastRadiusSelectionReport,
  RiskExecutionTier,
  ShardCoverageVerification,
  ShardDefinition,
} from './types.js';

const TIER_PRIORITY: Record<RiskExecutionTier, number> = {
  'daily-feedback': 1,
  'expanded-checks': 2,
  'platform-delivery': 3,
  'complete-verification': 4,
};

function escalateTier(current: RiskExecutionTier, candidate: RiskExecutionTier): RiskExecutionTier {
  return TIER_PRIORITY[candidate] > TIER_PRIORITY[current] ? candidate : current;
}

function discoverAllTestFiles(projectDir: string): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /\.test\.(?:ts|js|tsx|jsx)$/.test(entry.name)) {
        results.push(path.relative(projectDir, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(path.join(projectDir, 'test'));
  walk(path.join(projectDir, 'tests'));
  walk(path.join(projectDir, 'site'));
  return [...new Set(results)].sort();
}

export function discoverGitChangedFiles(projectDir: string): string[] {
  try {
    const diffOut = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const untrackedOut = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: projectDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set([...diffOut.split(/\r?\n/), ...untrackedOut.split(/\r?\n/)])]
      .map((f) => f.trim().replace(/\\/g, '/'))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isPureCopyOrDocFile(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/');
  if (norm === 'AGENTS.md' || norm === 'SKILL.md' || /^skills\/[^/]+\/SKILL\.md$/.test(norm)) {
    return false;
  }
  return (
    /\.(?:md|txt|png|jpg|jpeg|gif|webp)$/i.test(norm) &&
    !norm.startsWith('.fable/') &&
    !norm.startsWith('skills/')
  );
}

function isCompleteSuiteTrigger(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/');
  return (
    norm === 'package.json' ||
    norm === 'tsconfig.json' ||
    norm === 'src/core/state.ts' ||
    norm === 'src/core/types.ts' ||
    norm === 'src/core/skill-registry.ts' ||
    norm === 'skills/get-fable/registry.json' ||
    norm.startsWith('.github/workflows/')
  );
}

function isPlatformDeliveryTrigger(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/');
  return (
    norm === 'src/installer.ts' ||
    norm === 'src/core/skill-installer.ts' ||
    norm.startsWith('hooks/') ||
    norm.startsWith('site/') ||
    norm.startsWith('Formula/') ||
    norm === 'install.sh'
  );
}

/**
 * Reconstructed from references/audit.md:25-37 ("Select execution by risk") & SKILL.md:60-66
 * Maps changed files to risk tiers, affected test files, and fails closed on unknown code paths.
 */
export function selectTestsByRisk(
  projectDir: string,
  explicitChangedFiles?: string[]
): BlastRadiusSelectionReport {
  const changedFiles = (
    explicitChangedFiles && explicitChangedFiles.length > 0
      ? explicitChangedFiles
      : discoverGitChangedFiles(projectDir)
  ).map((f) => f.replace(/\\/g, '/'));

  const allTests = discoverAllTestFiles(projectDir);
  const testContents = new Map<string, string>();
  for (const testRel of allTests) {
    const abs = path.join(projectDir, testRel);
    try {
      testContents.set(testRel, fs.readFileSync(abs, 'utf-8'));
    } catch {
      // ignore unreadable
    }
  }

  if (changedFiles.length === 0) {
    return {
      projectDir,
      changedFiles: [],
      riskTier: 'daily-feedback',
      requiresCompleteSuite: false,
      zeroSelectionJustified: true,
      zeroSelectionReason: 'No changed files detected in workspace.',
      affectedTestFiles: [],
      directDependents: [],
      unmappedPaths: [],
      recommendedCommand: '# No test execution needed (0 changed files)',
      rationale: ['No workspace files changed; zero test selection is justified.'],
    };
  }

  if (changedFiles.every(isPureCopyOrDocFile)) {
    return {
      projectDir,
      changedFiles,
      riskTier: 'daily-feedback',
      requiresCompleteSuite: false,
      zeroSelectionJustified: true,
      zeroSelectionReason: `Pure documentation/copy changes (${changedFiles.join(', ')}) require no behavioral test run (SKILL.md:45,64).`,
      affectedTestFiles: [],
      directDependents: [],
      unmappedPaths: [],
      recommendedCommand: '# Zero test selection justified for pure documentation change',
      rationale: [
        'All changed files are non-executable documentation or static copy.',
        'SKILL.md:45,64: Pure copy changes need no new test or suite execution when reason is established.',
      ],
    };
  }

  let riskTier: RiskExecutionTier = 'daily-feedback';
  let requiresCompleteSuite = false;
  const affectedTests = new Set<string>();
  const directDependents = new Set<string>();
  const unmappedPaths: string[] = [];
  const rationale: string[] = [];

  for (const changed of changedFiles) {
    if (isPureCopyOrDocFile(changed)) continue;

    if (isCompleteSuiteTrigger(changed)) {
      riskTier = escalateTier(riskTier, 'complete-verification');
      requiresCompleteSuite = true;
      rationale.push(
        `Core infrastructure or contract file "${changed}" changed -> escalated to complete-verification (audit.md:32).`
      );
    } else if (isPlatformDeliveryTrigger(changed)) {
      riskTier = escalateTier(riskTier, 'platform-delivery');
      rationale.push(
        `Platform/delivery/hook surface "${changed}" changed -> escalated to platform-delivery (audit.md:31).`
      );
    } else if (changed.startsWith('src/core/') || changed === 'src/utils.ts' || changed === 'src/cli.ts') {
      riskTier = escalateTier(riskTier, 'expanded-checks');
    }

    // If the changed file is itself a test file
    if (/\.test\.(?:ts|js|tsx|jsx)$/.test(changed)) {
      if (fs.existsSync(path.join(projectDir, changed))) {
        affectedTests.add(changed);
      }
      continue;
    }

    // Check if the changed file exists on disk (audit.md:36 check unknown/deleted/renamed paths)
    const absChanged = path.join(projectDir, changed);
    const existsOnDisk = fs.existsSync(absChanged);

    const stem = path.basename(changed).replace(/\.(?:ts|js|tsx|jsx|py|json)$/, '');
    const noExt = changed.replace(/\.(?:ts|js|tsx|jsx)$/, '');
    let matchedCountForFile = 0;

    for (const [testRel, content] of testContents.entries()) {
      const testStem = path.basename(testRel).replace(/\.test\.(?:ts|js|tsx|jsx)$/, '');
      const mentionsModule =
        testStem === stem ||
        testStem.startsWith(`${stem}-`) ||
        content.includes(noExt) ||
        content.includes(`${stem}.ts`) ||
        content.includes(`${stem}.js`) ||
        content.includes(`/${stem}'`) ||
        content.includes(`/${stem}"`);

      if (mentionsModule) {
        affectedTests.add(testRel);
        directDependents.add(testRel);
        matchedCountForFile++;
      }
    }

    if (!existsOnDisk || matchedCountForFile === 0) {
      unmappedPaths.push(changed);
      riskTier = escalateTier(riskTier, 'expanded-checks');
      rationale.push(
        `Unmapped or unknown path "${changed}" has no direct test mapping; classification failures must not silently become successful skips (audit.md:36).`
      );
    }
  }

  const sortedAffected = [...affectedTests].sort();
  if (sortedAffected.length > 5 && riskTier === 'daily-feedback') {
    riskTier = 'expanded-checks';
  }

  const recommendedCommand = requiresCompleteSuite
    ? 'bun test'
    : sortedAffected.length > 0
      ? `bun test ${sortedAffected.join(' ')}`
      : 'bun test';

  if (sortedAffected.length > 0 && !requiresCompleteSuite) {
    rationale.push(
      `Selected ${sortedAffected.length} affected test file(s) covering blast radius at tier "${riskTier}".`
    );
  }

  return {
    projectDir,
    changedFiles,
    riskTier,
    requiresCompleteSuite,
    zeroSelectionJustified: false,
    zeroSelectionReason: null,
    affectedTestFiles: sortedAffected,
    directDependents: [...directDependents].sort(),
    unmappedPaths,
    recommendedCommand,
    rationale,
  };
}

/**
 * Reconstructed from references/audit.md:41-44 ("When introducing shards, establish that their union
 * covers the intended inventory and their intersections are empty unless overlap is deliberate.")
 */
export function verifyShardCoverage(
  inventory: string[],
  shards: ShardDefinition[],
  options: { allowDeliberateOverlap?: boolean } = {}
): ShardCoverageVerification {
  const normInventory = [...new Set(inventory.map((f) => f.replace(/\\/g, '/')))].sort();
  const counts = new Map<string, number>();

  for (const shard of shards) {
    for (const rawFile of shard.files) {
      const f = rawFile.replace(/\\/g, '/');
      counts.set(f, (counts.get(f) || 0) + 1);
    }
  }

  const missingFiles = normInventory.filter((f) => !counts.has(f));
  const duplicateFiles = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([file]) => file)
    .sort();

  const durations = shards
    .map((s) => s.measuredDurationMs ?? 0)
    .filter((d) => d > 0);
  const maxShardDurationMs = durations.length > 0 ? Math.max(...durations) : 0;
  const minShardDurationMs = durations.length > 0 ? Math.min(...durations) : 0;
  const imbalanceRatio =
    minShardDurationMs > 0 ? Number((maxShardDurationMs / minShardDurationMs).toFixed(2)) : 1;

  const overlapValid = options.allowDeliberateOverlap ? true : duplicateFiles.length === 0;
  const valid = missingFiles.length === 0 && overlapValid && shards.length > 0;

  return {
    valid,
    totalInventory: normInventory.length,
    coveredCount: normInventory.length - missingFiles.length,
    missingFiles,
    duplicateFiles,
    maxShardDurationMs,
    minShardDurationMs,
    imbalanceRatio,
  };
}
