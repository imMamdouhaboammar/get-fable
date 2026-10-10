/**
 * Fable Frontier Testing Engine — Repository Scanner & Tool Readiness Assessor
 *
 * Implements /repo-scan and /agentic-repo-discovery principles:
 * - Scans project topology and file distributions
 * - Detects project type: web-frontend, backend-api, microservices, monorepo, library
 * - Evaluates suitability of frontier tools and computes a 0-100 fit score
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { FrontierToolId, ProjectScanResult } from './types.js';

export function scanRepository(projectRoot: string): ProjectScanResult {
  const detectedLanguages: string[] = [];
  const detectedFrameworks: string[] = [];
  let packageManager: ProjectScanResult['packageManager'] = 'unknown';

  // 1. Detect package manager and languages
  if (existsSync(join(projectRoot, 'bun.lock')) || existsSync(join(projectRoot, 'bun.lockb'))) {
    packageManager = 'bun';
    detectedLanguages.push('typescript', 'javascript');
  } else if (existsSync(join(projectRoot, 'package-lock.json'))) {
    packageManager = 'npm';
    detectedLanguages.push('typescript', 'javascript');
  } else if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
    detectedLanguages.push('typescript', 'javascript');
  } else if (existsSync(join(projectRoot, 'yarn.lock'))) {
    packageManager = 'yarn';
    detectedLanguages.push('typescript', 'javascript');
  }

  if (existsSync(join(projectRoot, 'Cargo.toml'))) {
    detectedLanguages.push('rust');
    if (packageManager === 'unknown') packageManager = 'cargo';
  }
  if (existsSync(join(projectRoot, 'go.mod'))) {
    detectedLanguages.push('go');
    if (packageManager === 'unknown') packageManager = 'go';
  }
  if (existsSync(join(projectRoot, 'requirements.txt')) || existsSync(join(projectRoot, 'pyproject.toml'))) {
    detectedLanguages.push('python');
    if (packageManager === 'unknown') packageManager = 'pip';
  }

  // Deduplicate languages
  const uniqueLanguages = Array.from(new Set(detectedLanguages));

  // 2. Read package.json for frameworks and dependencies
  const pkgPath = join(projectRoot, 'package.json');
  let hasUiDependencies = false;
  let hasApiDependencies = false;
  let hasTestingDeps = false;

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {})
      };

      if (allDeps['react'] || allDeps['vue'] || allDeps['svelte'] || allDeps['next'] || allDeps['vite']) {
        hasUiDependencies = true;
        if (allDeps['next']) detectedFrameworks.push('nextjs');
        if (allDeps['react']) detectedFrameworks.push('react');
        if (allDeps['vue']) detectedFrameworks.push('vue');
        if (allDeps['vite']) detectedFrameworks.push('vite');
      }

      if (allDeps['express'] || allDeps['fastify'] || allDeps['koa'] || allDeps['nestjs'] || allDeps['hono']) {
        hasApiDependencies = true;
        if (allDeps['express']) detectedFrameworks.push('express');
        if (allDeps['fastify']) detectedFrameworks.push('fastify');
        if (allDeps['hono']) detectedFrameworks.push('hono');
      }

      if (allDeps['playwright'] || allDeps['@playwright/test'] || allDeps['cypress'] || allDeps['vitest'] || allDeps['jest']) {
        hasTestingDeps = true;
      }
    } catch {
      // Ignore parse error
    }
  }

  // 3. Detect Docker and Compose
  const hasDocker = existsSync(join(projectRoot, 'Dockerfile'));
  const hasCompose =
    existsSync(join(projectRoot, 'docker-compose.yml')) ||
    existsSync(join(projectRoot, 'docker-compose.yaml')) ||
    existsSync(join(projectRoot, 'compose.yml')) ||
    existsSync(join(projectRoot, 'docker-compose.test.yml'));

  // 4. Classify Project Type
  let projectType: ProjectScanResult['projectType'] = 'unknown';
  if (hasCompose) {
    projectType = 'microservices';
  } else if (hasUiDependencies && hasApiDependencies) {
    projectType = 'web-frontend';
  } else if (hasUiDependencies) {
    projectType = 'web-frontend';
  } else if (hasApiDependencies) {
    projectType = 'backend-api';
  } else if (existsSync(join(projectRoot, 'packages')) || existsSync(join(projectRoot, 'apps'))) {
    projectType = 'monorepo';
  } else if (existsSync(pkgPath)) {
    projectType = 'library';
  }

  // 5. Detect existing test files
  const existingTestFiles: string[] = [];
  function searchTestFiles(dir: string, depth = 0) {
    if (depth > 3 || !existsSync(dir)) return;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.fable') continue;
        const fullPath = join(dir, entry);
        const st = statSync(fullPath);
        if (st.isDirectory()) {
          searchTestFiles(fullPath, depth + 1);
        } else if (/\.(test|spec)\.(ts|js|jsx|tsx|go|py)$/.test(entry) || entry.endsWith('.cy.js') || entry.endsWith('.cy.ts')) {
          existingTestFiles.push(fullPath.replace(projectRoot + '/', ''));
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  searchTestFiles(projectRoot);

  // 6. Detect installed testing tools
  const installedTestingTools: FrontierToolId[] = [];
  if (existsSync(join(projectRoot, 'midscene.config.ts')) || existsSync(join(projectRoot, 'midscene.yaml'))) {
    installedTestingTools.push('midscene');
  }
  if (existsSync(join(projectRoot, 'keploy.yml')) || existsSync(join(projectRoot, 'keploy'))) {
    installedTestingTools.push('keploy');
  }
  if (existsSync(join(projectRoot, 'fable.distributed-e2e.json')) || existsSync(join(projectRoot, 'docker-compose.test.yml'))) {
    installedTestingTools.push('distributed-e2e');
  }
  if (existsSync(join(projectRoot, 'e2e.config.ts')) || existsSync(join(projectRoot, '.e2e'))) {
    installedTestingTools.push('tester-army');
  }
  if (existsSync(join(projectRoot, 'cypress.config.js')) || existsSync(join(projectRoot, 'cypress.config.ts'))) {
    installedTestingTools.push('minimal-repro');
  }
  if (packageManager === 'bun') {
    installedTestingTools.push('bun-test');
  }
  if (existsSync(join(projectRoot, 'vitest.config.ts')) || existsSync(join(projectRoot, 'vitest.config.js'))) {
    installedTestingTools.push('vitest');
  }
  if (existsSync(join(projectRoot, 'playwright.config.ts')) || existsSync(join(projectRoot, 'playwright.config.js'))) {
    installedTestingTools.push('playwright');
  }

  // 7. Calculate Recommendations & Fit Scores (0 to 100)
  const recommendedTools: ProjectScanResult['recommendedTools'] = [];

  // Midscene recommendation
  if (hasUiDependencies || projectType === 'web-frontend') {
    recommendedTools.push({
      toolId: 'midscene',
      score: 95,
      reason: 'Web UI detected. Midscene provides multimodal vision-based AI assertions without brittle DOM selectors.',
      priority: 'high'
    });
    recommendedTools.push({
      toolId: 'tester-army',
      score: 88,
      reason: 'Natural language E2E testing with Action Caching reduces regression test runtimes by caching verified UI steps.',
      priority: 'medium'
    });
  }

  // Keploy recommendation
  if (hasApiDependencies || projectType === 'backend-api' || projectType === 'microservices') {
    recommendedTools.push({
      toolId: 'keploy',
      score: 96,
      reason: 'Backend API detected. Keploy records network traffic and generates zero-code mocks & contract regression tests.',
      priority: 'high'
    });
  }

  // Distributed E2E recommendation
  if (hasCompose || hasDocker || projectType === 'microservices') {
    recommendedTools.push({
      toolId: 'distributed-e2e',
      score: 92,
      reason: 'Container/Compose detected. EfficientGo-style distributed orchestration asserts on readiness probes and service metrics.',
      priority: 'high'
    });
  }

  // Minimal Repro recommendation
  recommendedTools.push({
    toolId: 'minimal-repro',
    score: 85,
    reason: 'Isolates flaky test cases and regressions into self-contained minimal reproducers with red-green verification.',
    priority: 'medium'
  });

  // Native runners
  if (packageManager === 'bun') {
    recommendedTools.push({
      toolId: 'bun-test',
      score: 98,
      reason: 'Bun runtime detected. bun test delivers sub-second unit and integration test loops.',
      priority: 'high'
    });
  } else {
    recommendedTools.push({
      toolId: 'vitest',
      score: 90,
      reason: 'TypeScript project detected. Vitest provides fast ESM testing with instant watch mode.',
      priority: 'high'
    });
  }

  // Sort recommendations by score descending
  recommendedTools.sort((a, b) => b.score - a.score);

  return {
    projectRoot,
    projectType,
    detectedLanguages: uniqueLanguages,
    detectedFrameworks,
    packageManager,
    hasDocker,
    hasCompose,
    existingTestFiles,
    installedTestingTools,
    recommendedTools
  };
}
