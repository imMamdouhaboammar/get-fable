/**
 * Feature Reconstruction: Static & AST-Pattern Test Suite Value Auditor
 * Reverse-Engineered from: https://github.com/tt-a1i/test-value
 * Evidence Digest:
 *   - references/audit.md: sha256:982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757 (Lines 1-12)
 *   - references/decision-examples.md: sha256:a3c4228dbb5a42887842da09ecc0bfd8015d8828fec514a4af8e5edc792639f1 (Lines 5-64)
 *   - SKILL.md: sha256:a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e (Lines 20-48)
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  DetectedTestTrap,
  ProtectedBoundaryCategory,
  TestFileAuditReport,
  TestResponsibilityGroup,
  TestSuiteAuditSummary,
  TestValueDecisionAction,
} from './types.js';

/**
 * Reconstructed from references/audit.md:7
 * Groups test files into the 8 canonical responsibility domains.
 */
export function classifyResponsibilityGroup(filePath: string, content: string): TestResponsibilityGroup {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();

  if (
    /supply-chain|package-distribution|install|platform-installer|host-installer/.test(norm) ||
    /\.github\/workflows/.test(content)
  ) {
    return 'distribution-installation';
  }
  if (/catalog-generation|llms-txt|generated/.test(norm)) {
    return 'generated-artifacts';
  }
  if (/state-boundary|atomic-write|windows|state-concurrency|pending-mutation|git-hooks|shell-system/.test(norm)) {
    return 'filesystem-process-safety';
  }
  if (/site\.test|ui-polish|web-server|cypress|browser|playwright/.test(norm)) {
    return 'browser-platform';
  }
  if (/cli\.test|hook-dispatch|provider-translator|grok-adapter|dsh-plugin|worker-rpc/.test(norm)) {
    return 'entrypoint-integration';
  }
  if (/router|spark|toon|architecture|neural-linking|eval-runner|verification-eval/.test(norm)) {
    return 'shared-algorithms';
  }
  if (/ci-|select|shard/.test(norm)) {
    return 'ci-selection';
  }
  return 'core-behavior';
}

/**
 * Reconstructed from SKILL.md:47 ("Preserve effective protection against data loss or corruption,
 * permission and trust-boundary failures, promised compatibility, essential accessibility failures,
 * resource leaks and broken recovery.")
 */
export function detectProtectedBoundaries(filePath: string, content: string): ProtectedBoundaryCategory[] {
  const boundaries = new Set<ProtectedBoundaryCategory>();
  const combined = `${filePath}\n${content}`;

  if (
    /\b(?:state\.json|atomicWrite|corrupt|workspaceId|stateRevision|mutationGeneration|pending-mutation|lock|transaction)\b/i.test(
      combined
    )
  ) {
    boundaries.add('data-integrity');
  }
  if (
    /\b(?:security|redteam|ssrf|sqli|idor|auth|bearer|token|secret|traversal|symlink|cwe|cvss|sha256|supply-chain|workflows)\b/i.test(
      combined
    )
  ) {
    boundaries.add('permissions-trust-boundary');
  }
  if (
    /\b(?:windows|win32|schemaVersion|migration|legacy|backward|compat|host-parity|provider-contract)\b/i.test(
      combined
    )
  ) {
    boundaries.add('compatibility');
  }
  if (/\b(?:a11y|aria-|contrast|viewBox|accessibility|wcag|keyboard|screen-reader)\b/i.test(combined)) {
    boundaries.add('essential-accessibility');
  }
  if (/\b(?:rmSync|cleanup|afterEach|close|dispose|teardown|kill|tempDirs|unlink)\b/.test(combined)) {
    boundaries.add('resource-cleanup');
  }
  if (/\b(?:recover|failureStreak|circuitBreaker|rollback|heal|retry|fallback)\b/i.test(combined)) {
    boundaries.add('failure-recovery');
  }

  if (boundaries.size === 0) {
    boundaries.add('core-contract');
  }

  return [...boundaries];
}

/**
 * Reconstructed from references/decision-examples.md:5-64
 * Scans a test file's source lines for the 8 brittle test traps while honoring legitimate static rules.
 */
export function detectBrittleTraps(filePath: string, content: string): DetectedTestTrap[] {
  const traps: DetectedTestTrap[] = [];
  const lines = content.split(/\r?\n/);
  const normPath = filePath.replace(/\\/g, '/');

  const isLegitimateStaticRuleFile =
    /supply-chain|package-distribution|catalog-generation|llms-txt|skill-authoring-lint|public-json-contracts/.test(
      normPath
    );

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // 1. Source-spelling assertion (decision-examples.md:21-28)
    if (
      !isLegitimateStaticRuleFile &&
      /readFileSync\s*\([^)]*\.(?:ts|js|py|tsx|jsx)['"`]/.test(trimmed)
    ) {
      const windowText = lines.slice(idx, Math.min(lines.length, idx + 6)).join('\n');
      const isArchitecturalOrPackagingRule =
        /\.github\/workflows|package\.json|schema\.json|registry\.json/.test(windowText);
      if (
        !isArchitecturalOrPackagingRule &&
        /\.(?:toContain|toMatch)\s*\(\s*['"`/](?:function|const|class|private|export)\b/.test(windowText)
      ) {
        traps.push({
          kind: 'source-spelling-assertion',
          line: lineNum,
          snippet: trimmed.slice(0, 120),
          remediation:
            'Execute the module or CLI boundary and assert observable output/state instead of grepping source spelling (decision-examples.md:21-28).',
        });
      }
    }

    // 2. Arbitrary sleep timing assumption (decision-examples.md:45-50)
    // Distinguish unconditional sleeps (>=100ms) from bounded readiness-probe polling loops (e.g. catch { await Bun.sleep(50) }).
    const surroundingWindow = lines.slice(Math.max(0, idx - 3), Math.min(lines.length, idx + 2)).join('\n');
    const isReadinessPollingBackoff =
      /\b(?:for\s*\(\s*let\s+attempt|while\s*\()/.test(surroundingWindow) && /\bcatch\b/.test(surroundingWindow);
    if (
      !isReadinessPollingBackoff &&
      /\b(?:new\s+Promise\s*\([^)]*setTimeout|await\s+Bun\.sleep\s*\(\s*[1-9]\d{2,}|setTimeout\s*\([^,]+,\s*[1-9]\d{2,})\b/.test(
        trimmed
      )
    ) {
      traps.push({
        kind: 'sleep-timing-assumption',
        line: lineNum,
        snippet: trimmed.slice(0, 120),
        remediation:
          'Replace fixed sleep waits with explicit readiness signals, deterministic barriers, or controllable fake clocks (decision-examples.md:45-50).',
      });
    }

    // 3. Noncontractual snapshot freezing (decision-examples.md:5-12)
    if (/\b(?:toMatchSnapshot|toMatchInlineSnapshot)\s*\(/.test(trimmed)) {
      traps.push({
        kind: 'noncontractual-snapshot',
        line: lineNum,
        snippet: trimmed.slice(0, 120),
        remediation:
          'Separate explicit contractual constraints from algorithm-selected output; assert semantic properties rather than brittle full snapshots (decision-examples.md:5-12).',
      });
    }

    // 4. Private implementation coupling (SKILL.md:30, decision-examples.md:27)
    if (/\[\s*['"`]_[a-zA-Z0-9]+['"`]\s*\]|\.toHaveBeenCalledTimes\s*\(\s*[2-9]\d*\s*\)/.test(trimmed)) {
      traps.push({
        kind: 'private-implementation-coupling',
        line: lineNum,
        snippet: trimmed.slice(0, 120),
        remediation:
          'Avoid coupling assertions to private member names or incidental internal call counts; assert public contract outcomes (SKILL.md:30).',
      });
    }
  });

  // 5. Mock-only verification without observable state/output check (decision-examples.md:59-64)
  const testBlocks = content.split(/\b(?:test|it)\s*\(/).slice(1);
  for (const block of testBlocks) {
    const hasMockCallAssertion = /\btoHaveBeenCalled(?:Times|With)?\s*\(/.test(block);
    const otherAssertions = block
      .replace(/\bexpect\s*\([^)]*\)\s*\.\s*(?:not\s*\.\s*)?toHaveBeenCalled(?:Times|With)?\s*\([^)]*\)/g, '')
      .match(/\bexpect\s*\(/g);
    if (hasMockCallAssertion && (!otherAssertions || otherAssertions.length === 0)) {
      const mockLineIdx = lines.findIndex((l) => /\btoHaveBeenCalled(?:Times|With)?\s*\(/.test(l));
      traps.push({
        kind: 'mock-only-verification',
        line: mockLineIdx >= 0 ? mockLineIdx + 1 : 1,
        snippet: 'expect(mockFn).toHaveBeenCalled... (with no observable state/output assertion)',
        remediation:
          'Add an assertion on observable output, state mutation, or returned contract rather than only verifying mock invocation (decision-examples.md:59-64).',
      });
      break;
    }
  }

  // 6. Cross-product matrix bloat (decision-examples.md:13-20)
  // Only trigger when nested loops directly enclose test() / it() registration without closing the outer loop first.
  if (/for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)\s*\{[^}]*\b(?:test|it)\s*\(/.test(content)) {
    const loopLine = lines.findIndex((l) => /for\s*\(/.test(l));
    traps.push({
      kind: 'cross-product-matrix-bloat',
      line: loopLine >= 0 ? loopLine + 1 : 1,
      snippet: 'Nested for-loops generating cross-product test cases',
      remediation:
        'Cover the complete rule catalog through one shared path and test only entrypoint-specific integration and overrides (decision-examples.md:13-20).',
    });
  }

  return traps;
}

/**
 * Audits a single test file's content and computes its Test-Value scores and decision recommendation.
 */
export function analyzeTestFileContent(filePath: string, content: string): TestFileAuditReport {
  const responsibilityGroup = classifyResponsibilityGroup(filePath, content);
  const protectedBoundaries = detectProtectedBoundaries(filePath, content);
  const traps = detectBrittleTraps(filePath, content);

  const testMatches = content.match(/\b(?:test|it)\s*\(/g);
  const assertionMatches = content.match(/\bexpect\s*\(/g);
  const testCount = testMatches ? testMatches.length : 0;
  const assertionCount = assertionMatches ? assertionMatches.length : 0;

  const hasHighConsequence = protectedBoundaries.some((b) => b !== 'core-contract' && b !== 'incidental');
  const baseProtection = hasHighConsequence ? 90 : 75;
  const assertionBonus = Math.min(10, Math.floor(assertionCount / Math.max(1, testCount)) * 2);
  const mockPenalty = traps.some((t) => t.kind === 'mock-only-verification') ? 25 : 0;
  const protectionScore = Math.max(10, Math.min(100, baseProtection + assertionBonus - mockPenalty));

  const trapPenalty = traps.reduce((acc, trap) => {
    switch (trap.kind) {
      case 'source-spelling-assertion':
        return acc + 35;
      case 'noncontractual-snapshot':
        return acc + 30;
      case 'private-implementation-coupling':
        return acc + 25;
      case 'mock-only-verification':
        return acc + 25;
      case 'sleep-timing-assumption':
        return acc + 20;
      case 'cross-product-matrix-bloat':
        return acc + 20;
      default:
        return acc + 15;
    }
  }, 0);
  const refactorResilienceScore = Math.max(0, 100 - trapPenalty);

  const lineCount = content.split(/\r?\n/).length;
  const sizeCost = Math.min(40, Math.round(lineCount / 15));
  const trapMaintenanceCost = traps.length * 18;
  const maintenanceCostScore = Math.min(100, sizeCost + trapMaintenanceCost);

  const netValueScore = Math.max(
    -100,
    Math.min(
      100,
      Math.round(protectionScore * 0.55 + refactorResilienceScore * 0.45 - maintenanceCostScore * 0.5)
    )
  );

  let recommendedAction: TestValueDecisionAction = 'PRESERVE_AND_TIER_BY_RISK';
  if (traps.some((t) => t.kind === 'source-spelling-assertion' || t.kind === 'noncontractual-snapshot')) {
    recommendedAction = 'RELAX_TO_CONTRACT_PROPERTIES';
  } else if (traps.some((t) => t.kind === 'cross-product-matrix-bloat')) {
    recommendedAction = 'FACTOR_SHARED_RULE_MATRIX';
  } else if (traps.some((t) => t.kind === 'mock-only-verification')) {
    recommendedAction = 'ADD_CHEAPEST_REGRESSION';
  } else if (testCount === 0) {
    recommendedAction = 'RETIRE_OBSOLETE';
  } else if (netValueScore >= 60) {
    recommendedAction = 'REUSE_OR_EXTEND';
  }

  return {
    filePath,
    responsibilityGroup,
    testCount,
    assertionCount,
    protectedBoundaries,
    traps,
    protectionScore,
    refactorResilienceScore,
    maintenanceCostScore,
    netValueScore,
    recommendedAction,
  };
}

function collectTestFiles(projectDir: string, targetPaths?: string[]): string[] {
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

  if (targetPaths && targetPaths.length > 0) {
    for (const target of targetPaths) {
      const resolved = path.resolve(projectDir, target);
      if (!fs.existsSync(resolved)) continue;
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        walk(resolved);
      } else if (stat.isFile()) {
        results.push(path.relative(projectDir, resolved).replace(/\\/g, '/'));
      }
    }
  } else {
    walk(path.join(projectDir, 'test'));
    walk(path.join(projectDir, 'tests'));
    walk(path.join(projectDir, 'site'));
  }

  return [...new Set(results)].sort();
}

/**
 * Reconstructed from references/audit.md:1-12 ("Auditing Existing Tests: Map the cost")
 */
export function auditTestSuite(projectDir: string, targetPaths?: string[]): TestSuiteAuditSummary {
  const filesToAudit = collectTestFiles(projectDir, targetPaths);
  const reports: TestFileAuditReport[] = [];

  const byResponsibility: Record<TestResponsibilityGroup, string[]> = {
    'core-behavior': [],
    'shared-algorithms': [],
    'entrypoint-integration': [],
    'browser-platform': [],
    'filesystem-process-safety': [],
    'distribution-installation': [],
    'generated-artifacts': [],
    'ci-selection': [],
  };

  for (const relPath of filesToAudit) {
    const absPath = path.join(projectDir, relPath);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, 'utf-8');
    const report = analyzeTestFileContent(relPath, content);
    reports.push(report);
    byResponsibility[report.responsibilityGroup].push(relPath);
  }

  const totalFiles = reports.length;
  const totalTests = reports.reduce((sum, r) => sum + r.testCount, 0);
  const totalAssertions = reports.reduce((sum, r) => sum + r.assertionCount, 0);
  const totalTraps = reports.reduce((sum, r) => sum + r.traps.length, 0);

  const avg = (fn: (r: TestFileAuditReport) => number) =>
    totalFiles === 0 ? 0 : Math.round(reports.reduce((s, r) => s + fn(r), 0) / totalFiles);

  const highValueCandidates = reports
    .filter((r) => r.traps.length > 0 || r.netValueScore < 45)
    .sort((a, b) => a.netValueScore - b.netValueScore);

  return {
    projectDir,
    totalFiles,
    totalTests,
    totalAssertions,
    totalTraps,
    averageProtectionScore: avg((r) => r.protectionScore),
    averageRefactorResilienceScore: avg((r) => r.refactorResilienceScore),
    averageNetValueScore: avg((r) => r.netValueScore),
    byResponsibility,
    files: reports,
    highValueCandidates,
  };
}
