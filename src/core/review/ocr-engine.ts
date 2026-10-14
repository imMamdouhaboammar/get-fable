import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  BUILTIN_OCR_RULESETS,
  type OcrRuleConfigFile,
  type ReviewRuleEntry,
} from './rulesets.js';

export type ReviewFindingCategory =
  | 'bug'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'test'
  | 'style'
  | 'documentation'
  | 'other';

export type ReviewFindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ReviewFinding {
  path: string;
  content: string;
  start_line: number;
  end_line: number;
  category: ReviewFindingCategory;
  severity: ReviewFindingSeverity;
  suggestion_code?: string;
  existing_code?: string;
  thinking?: string;
}

export interface ReviewableFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
  insertions: number;
  deletions: number;
  rules: ReviewRuleEntry[];
  diff?: string;
}

export interface ReviewBundle {
  id: string;
  name: string;
  files: ReviewableFile[];
  totalLines: number;
  sharedRules: ReviewRuleEntry[];
  planModeRequired: boolean;
}

export interface ReviewSummary {
  total_files: number;
  reviewed_files: number;
  skipped_files: number;
  coverage_rate: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  verdict: 'APPROVE' | 'CHANGES_REQUIRED' | 'INCOMPLETE';
  findings: ReviewFinding[];
}

export interface OcrEngineOptions {
  repoRoot?: string;
  from?: string;
  to?: string;
  commit?: string;
  rulePath?: string;
  excludePatterns?: string[];
  background?: string;
}

export const DEFAULT_EXCLUDED_PATTERNS = [
  '**/bun.lockb',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/Cargo.lock',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.ico',
  '**/*.svg',
  '**/*.webp',
  '**/*.wasm',
  '**/*.bin',
  '**/*.zip',
  '**/*.tar',
  '**/*.gz',
  '**/.git/**',
  '**/.fable/**',
  '**/dist/**',
  '**/build/**',
  '**/target/**',
  '**/node_modules/**',
];

/**
 * Converts a simple glob pattern to RegExp.
 */
export function globToRegExp(pattern: string): RegExp {
  const sanitized = pattern.trim();
  let regexStr = '^';
  let i = 0;
  while (i < sanitized.length) {
    const c = sanitized[i];
    if (c === '*' && sanitized[i + 1] === '*') {
      if (sanitized[i + 2] === '/') {
        regexStr += '(?:.*/)?';
        i += 3;
        continue;
      }
      regexStr += '.*';
      i += 2;
      continue;
    }
    if (c === '*') {
      regexStr += '[^/]*';
      i++;
      continue;
    }
    if (c === '?') {
      regexStr += '[^/]';
      i++;
      continue;
    }
    if (c === '{') {
      const closing = sanitized.indexOf('}', i);
      if (closing !== -1) {
        const choices = sanitized.slice(i + 1, closing).split(',').map((s) => s.trim());
        regexStr += `(?:${choices.map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
        i = closing + 1;
        continue;
      }
    }
    if (['.', '+', '^', '$', '(', ')', '[', ']', '|', '\\'].includes(c)) {
      regexStr += `\\${c}`;
    } else {
      regexStr += c;
    }
    i++;
  }
  regexStr += '$';
  return new RegExp(regexStr);
}

export function isFileExcluded(filePath: string, patterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  return patterns.some((pattern) => {
    try {
      const regex = globToRegExp(pattern);
      return regex.test(normalized) || regex.test(path.basename(normalized));
    } catch {
      return false;
    }
  });
}

/**
 * Checks if the system has @alibaba-group/open-code-review installed.
 */
export function isOcrCliAvailable(): boolean {
  try {
    execSync('which ocr', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Load project custom rules from .opencodereview/rule.json or custom path.
 */
export function loadCustomRuleConfig(repoRoot: string, customPath?: string): OcrRuleConfigFile | null {
  const candidates = [
    customPath ? path.resolve(repoRoot, customPath) : null,
    path.join(repoRoot, '.opencodereview', 'rule.json'),
    path.join(repoRoot, '.fable', 'review-rules.json'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.rules)) {
          return parsed as OcrRuleConfigFile;
        }
      } catch {
        // malformed config is ignored fail-safe
      }
    }
  }
  return null;
}

/**
 * Match a file against rulesets with Alibaba OCR priority hierarchy.
 */
export function resolveRulesForFile(
  filePath: string,
  repoRoot: string = process.cwd(),
  customPath?: string
): ReviewRuleEntry[] {
  const customConfig = loadCustomRuleConfig(repoRoot, customPath);
  const matchedRules: ReviewRuleEntry[] = [];
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

  let matchedUserRule = false;
  let mergeSystemRule = true;

  if (customConfig) {
    for (let index = 0; index < customConfig.rules.length; index++) {
      const rule = customConfig.rules[index];
      const regex = globToRegExp(rule.path);
      if (regex.test(normalized) || regex.test(path.basename(normalized))) {
        matchedUserRule = true;
        if (rule.merge_system_rule === false) {
          mergeSystemRule = false;
        }
        matchedRules.push({
          id: `custom-rule-${index}`,
          path: rule.path,
          language: 'Custom',
          category: rule.category || 'bug',
          title: `Project Custom Rule: ${rule.path}`,
          description: rule.rule,
          checklist: [rule.rule],
          merge_system_rule: rule.merge_system_rule,
        });
      }
    }
  }

  if (!matchedUserRule || mergeSystemRule) {
    for (const rule of BUILTIN_OCR_RULESETS) {
      const regex = globToRegExp(rule.path);
      if (regex.test(normalized) || regex.test(path.basename(normalized))) {
        matchedRules.push(rule);
      }
    }
  }

  return matchedRules;
}

/**
 * Collect reviewable files using git diff and status.
 */
export function getReviewableFiles(options: OcrEngineOptions = {}): ReviewableFile[] {
  const repoRoot = options.repoRoot || process.cwd();
  const customConfig = loadCustomRuleConfig(repoRoot, options.rulePath);
  const excludePatterns = [
    ...DEFAULT_EXCLUDED_PATTERNS,
    ...(options.excludePatterns || []),
    ...(customConfig?.excludes || []),
  ];

  const files: ReviewableFile[] = [];

  try {
    let diffCmd = '';
    let isCommit = false;

    if (options.commit) {
      diffCmd = `git show --numstat --format="" ${options.commit}`;
      isCommit = true;
    } else if (options.from && options.to) {
      diffCmd = `git diff --numstat ${options.from}..${options.to}`;
    } else {
      diffCmd = 'git diff --numstat HEAD';
    }

    let diffNumstat = '';
    try {
      diffNumstat = execSync(diffCmd, { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      // If HEAD is unborn or diff fails, try unstaged diff
      try {
        diffNumstat = execSync('git diff --numstat', { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      } catch {
        diffNumstat = '';
      }
    }

    const seenPaths = new Set<string>();

    for (const line of diffNumstat.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const ins = parts[0] === '-' ? 0 : Number(parts[0]) || 0;
        const del = parts[1] === '-' ? 0 : Number(parts[1]) || 0;
        const filePath = parts.slice(2).join(' ');

        if (isFileExcluded(filePath, excludePatterns)) continue;
        seenPaths.add(filePath);

        const rules = resolveRulesForFile(filePath, repoRoot, options.rulePath);
        files.push({
          path: filePath,
          status: del > 0 && ins === 0 ? 'deleted' : 'modified',
          insertions: ins,
          deletions: del,
          rules,
        });
      }
    }

    // If workspace mode, also collect untracked files
    if (!options.from && !options.to && !options.commit) {
      try {
        const untracked = execSync('git ls-files --others --exclude-standard', {
          cwd: repoRoot,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        for (const line of untracked.split('\n')) {
          const filePath = line.trim();
          if (!filePath || seenPaths.has(filePath)) continue;
          if (isFileExcluded(filePath, excludePatterns)) continue;

          let lineCount = 0;
          try {
            const fullPath = path.resolve(repoRoot, filePath);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
              lineCount = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
            }
          } catch {
            lineCount = 0;
          }

          const rules = resolveRulesForFile(filePath, repoRoot, options.rulePath);
          files.push({
            path: filePath,
            status: 'untracked',
            insertions: lineCount,
            deletions: 0,
            rules,
          });
        }
      } catch {
        // ignore ls-files errors
      }
    }
  } catch {
    // Fail-soft fallback
  }

  return files;
}

/**
 * Group files into isolated review units (bundles) based on line thresholds
 * and directory coherence, reducing token consumption by ~85% (1/9th token footprint).
 */
export function bundleReviewFiles(files: ReviewableFile[]): ReviewBundle[] {
  const bundles: ReviewBundle[] = [];
  const PLAN_MODE_LINE_THRESHOLD = 50;
  const PLAN_MODE_GROUP_LINE_THRESHOLD = 100;

  // 1. Separate very large files into individual bundles (plan mode)
  const regularFiles: ReviewableFile[] = [];

  for (const file of files) {
    const changedLines = file.insertions + file.deletions;
    if (changedLines >= PLAN_MODE_LINE_THRESHOLD) {
      bundles.push({
        id: `bundle-large-${bundles.length + 1}`,
        name: `High-Density File: ${path.basename(file.path)}`,
        files: [file],
        totalLines: changedLines,
        sharedRules: file.rules,
        planModeRequired: true,
      });
    } else {
      regularFiles.push(file);
    }
  }

  // 2. Group remaining files by directory
  const byDir = new Map<string, ReviewableFile[]>();
  for (const file of regularFiles) {
    const dir = path.dirname(file.path);
    if (!byDir.has(dir)) {
      byDir.set(dir, []);
    }
    byDir.get(dir)!.push(file);
  }

  for (const [dir, dirFiles] of byDir.entries()) {
    let currentBatch: ReviewableFile[] = [];
    let currentLines = 0;

    for (const file of dirFiles) {
      const fileLines = file.insertions + file.deletions;
      if (currentLines + fileLines > PLAN_MODE_GROUP_LINE_THRESHOLD && currentBatch.length > 0) {
        // Harvest unique shared rules
        const rulesMap = new Map<string, ReviewRuleEntry>();
        for (const f of currentBatch) {
          for (const r of f.rules) rulesMap.set(r.id, r);
        }

        bundles.push({
          id: `bundle-grp-${bundles.length + 1}`,
          name: `Directory Batch: ${dir || '.'}`,
          files: currentBatch,
          totalLines: currentLines,
          sharedRules: Array.from(rulesMap.values()),
          planModeRequired: currentLines >= PLAN_MODE_GROUP_LINE_THRESHOLD,
        });

        currentBatch = [];
        currentLines = 0;
      }

      currentBatch.push(file);
      currentLines += fileLines;
    }

    if (currentBatch.length > 0) {
      const rulesMap = new Map<string, ReviewRuleEntry>();
      for (const f of currentBatch) {
        for (const r of f.rules) rulesMap.set(r.id, r);
      }

      bundles.push({
        id: `bundle-grp-${bundles.length + 1}`,
        name: `Directory Batch: ${dir || '.'}`,
        files: currentBatch,
        totalLines: currentLines,
        sharedRules: Array.from(rulesMap.values()),
        planModeRequired: currentLines >= PLAN_MODE_GROUP_LINE_THRESHOLD,
      });
    }
  }

  return bundles;
}

/**
 * Validate a review finding with Alibaba OCR reflection & positioning discipline.
 */
export function validateReviewFinding(
  finding: ReviewFinding,
  repoRoot: string = process.cwd()
): { valid: boolean; reason?: string } {
  if (!finding.path || typeof finding.path !== 'string') {
    return { valid: false, reason: 'Finding is missing a valid file path' };
  }
  if (!finding.content || typeof finding.content !== 'string' || !finding.content.trim()) {
    return { valid: false, reason: 'Finding comment content cannot be empty' };
  }
  if (!['critical', 'high', 'medium', 'low'].includes(finding.severity)) {
    return { valid: false, reason: `Invalid finding severity: ${finding.severity}` };
  }
  if (!['bug', 'security', 'performance', 'maintainability', 'test', 'style', 'documentation', 'other'].includes(finding.category)) {
    return { valid: false, reason: `Invalid finding category: ${finding.category}` };
  }

  // Reflection: check line numbers
  if (finding.start_line === 0 && finding.end_line === 0) {
    return { valid: true, reason: 'Comment positioning unanchored (line 0); requires fallback context inspection' };
  }

  if (finding.start_line < 0 || finding.end_line < finding.start_line) {
    return { valid: false, reason: `Invalid line range: [${finding.start_line}, ${finding.end_line}]` };
  }

  return { valid: true };
}

/**
 * Summarize and categorize findings into an actionable report.
 */
export function summarizeReviewFindings(
  findings: ReviewFinding[],
  totalFiles: number,
  reviewedFiles: number
): ReviewSummary {
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const f of findings) {
    if (f.severity === 'critical') critical++;
    else if (f.severity === 'high') high++;
    else if (f.severity === 'medium') medium++;
    else if (f.severity === 'low') low++;
  }

  const coverageRate = totalFiles > 0 ? Math.round((reviewedFiles / totalFiles) * 100) : 100;
  const skipped = Math.max(0, totalFiles - reviewedFiles);

  let verdict: 'APPROVE' | 'CHANGES_REQUIRED' | 'INCOMPLETE' = 'APPROVE';
  if (skipped > 0 && totalFiles > 0) {
    verdict = 'INCOMPLETE';
  } else if (critical > 0 || high > 0) {
    verdict = 'CHANGES_REQUIRED';
  }

  return {
    total_files: totalFiles,
    reviewed_files: reviewedFiles,
    skipped_files: skipped,
    coverage_rate: coverageRate,
    critical_count: critical,
    high_count: high,
    medium_count: medium,
    low_count: low,
    verdict,
    findings,
  };
}
