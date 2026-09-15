import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  globToRegExp,
  isFileExcluded,
  resolveRulesForFile,
  bundleReviewFiles,
  validateReviewFinding,
  summarizeReviewFindings,
  type ReviewableFile,
  type ReviewFinding,
  DEFAULT_EXCLUDED_PATTERNS,
} from '../src/core/review/index.js';

describe('Alibaba Open Code Review (OCR) Deterministic Engine', () => {
  describe('File Filtering & Glob Matching', () => {
    test('globToRegExp matches simple and recursive patterns', () => {
      const reTs = globToRegExp('**/*.ts');
      expect(reTs.test('src/core/review.ts')).toBe(true);
      expect(reTs.test('index.ts')).toBe(true);
      expect(reTs.test('image.png')).toBe(false);

      const reMulti = globToRegExp('**/*.{ts,tsx,js}');
      expect(reMulti.test('components/Header.tsx')).toBe(true);
      expect(reMulti.test('lib/utils.js')).toBe(true);
      expect(reMulti.test('lib/utils.py')).toBe(false);
    });

    test('isFileExcluded filters lockfiles, minified files, and binary assets', () => {
      expect(isFileExcluded('bun.lockb', DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
      expect(isFileExcluded('package-lock.json', DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
      expect(isFileExcluded('Cargo.lock', DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
      expect(isFileExcluded('assets/logo.png', DEFAULT_EXCLUDED_PATTERNS)).toBe(true);
      expect(isFileExcluded('dist/bundle.min.js', DEFAULT_EXCLUDED_PATTERNS)).toBe(true);

      expect(isFileExcluded('src/server.ts', DEFAULT_EXCLUDED_PATTERNS)).toBe(false);
      expect(isFileExcluded('lib/algo.py', DEFAULT_EXCLUDED_PATTERNS)).toBe(false);
    });
  });

  describe('Multi-Language Rule Resolution', () => {
    test('resolves TypeScript built-in rules for .ts and .tsx files', () => {
      const rules = resolveRulesForFile('src/auth/jwt.ts');
      const ruleIds = rules.map((r) => r.id);

      expect(ruleIds).toContain('ocr-ts-nullish-safety');
      expect(ruleIds).toContain('ocr-ts-concurrency-async');
      expect(ruleIds).toContain('ocr-ts-security-xss-injection');
      expect(ruleIds).toContain('ocr-ts-resource-discipline');
    });

    test('resolves Python built-in rules for .py files', () => {
      const rules = resolveRulesForFile('scripts/process_data.py');
      const ruleIds = rules.map((r) => r.id);

      expect(ruleIds).toContain('ocr-py-none-safety');
      expect(ruleIds).toContain('ocr-py-security-injection');
      expect(ruleIds).toContain('ocr-py-context-resources');
    });

    test('resolves Go built-in rules for .go files', () => {
      const rules = resolveRulesForFile('cmd/server/main.go');
      const ruleIds = rules.map((r) => r.id);

      expect(ruleIds).toContain('ocr-go-nil-safety');
      expect(ruleIds).toContain('ocr-go-concurrency-goroutines');
      expect(ruleIds).toContain('ocr-go-resource-cleanup');
    });

    test('resolves Rust built-in rules for .rs files', () => {
      const rules = resolveRulesForFile('crates/fable-core/src/lib.rs');
      const ruleIds = rules.map((r) => r.id);

      expect(ruleIds).toContain('ocr-rust-panic-safety');
      expect(ruleIds).toContain('ocr-rust-concurrency-locks');
    });

    test('merges project-specific rules from .opencodereview/rule.json', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-rules-test-'));
      const ocrDir = path.join(tempDir, '.opencodereview');
      fs.mkdirSync(ocrDir, { recursive: true });

      fs.writeFileSync(
        path.join(ocrDir, 'rule.json'),
        JSON.stringify({
          rules: [
            {
              path: '**/*.ts',
              rule: 'Custom project invariant: all methods must return Result envelope',
              category: 'bug',
              merge_system_rule: true,
            },
          ],
        })
      );

      try {
        const rules = resolveRulesForFile('src/handler.ts', tempDir);
        expect(rules.some((r) => r.description.includes('Custom project invariant'))).toBe(true);
        expect(rules.some((r) => r.id === 'ocr-ts-nullish-safety')).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('File Bundling & Plan Mode Thresholds', () => {
    test('isolates single files with >= 50 lines into individual plan mode bundles', () => {
      const files: ReviewableFile[] = [
        {
          path: 'src/huge-file.ts',
          status: 'modified',
          insertions: 60,
          deletions: 10,
          rules: [],
        },
        {
          path: 'src/small-1.ts',
          status: 'modified',
          insertions: 10,
          deletions: 5,
          rules: [],
        },
        {
          path: 'src/small-2.ts',
          status: 'modified',
          insertions: 5,
          deletions: 2,
          rules: [],
        },
      ];

      const bundles = bundleReviewFiles(files);
      expect(bundles.length).toBe(2);

      const largeBundle = bundles.find((b) => b.name.includes('High-Density File'));
      expect(largeBundle).toBeDefined();
      expect(largeBundle?.planModeRequired).toBe(true);
      expect(largeBundle?.files[0].path).toBe('src/huge-file.ts');
    });

    test('groups small files by directory and splits when group lines exceed 100', () => {
      const files: ReviewableFile[] = [
        { path: 'src/api/a.ts', status: 'modified', insertions: 40, deletions: 0, rules: [] },
        { path: 'src/api/b.ts', status: 'modified', insertions: 40, deletions: 0, rules: [] },
        { path: 'src/api/c.ts', status: 'modified', insertions: 40, deletions: 0, rules: [] },
      ];

      const bundles = bundleReviewFiles(files);
      // 40 + 40 = 80, next is 40 -> 120 > 100, so it splits into 2 bundles
      expect(bundles.length).toBe(2);
      expect(bundles[0].files.length).toBe(2);
      expect(bundles[1].files.length).toBe(1);
    });
  });

  describe('Alibaba OCR Finding Validation & Reflection', () => {
    test('validates conformant finding with exact line anchoring', () => {
      const finding: ReviewFinding = {
        path: 'src/auth.ts',
        start_line: 12,
        end_line: 15,
        category: 'security',
        severity: 'critical',
        content: 'Unescaped parameter passed to raw SQL query',
        suggestion_code: 'db.query("SELECT * FROM users WHERE id = $1", [id]);',
      };

      const result = validateReviewFinding(finding);
      expect(result.valid).toBe(true);
    });

    test('flags line 0 finding as unanchored positioning', () => {
      const finding: ReviewFinding = {
        path: 'src/auth.ts',
        start_line: 0,
        end_line: 0,
        category: 'bug',
        severity: 'medium',
        content: 'Potential null dereference in callback',
      };

      const result = validateReviewFinding(finding);
      expect(result.valid).toBe(true);
      expect(result.reason).toContain('unanchored');
    });

    test('rejects finding with invalid line numbers or invalid severity', () => {
      const findingBadLines: ReviewFinding = {
        path: 'src/auth.ts',
        start_line: 20,
        end_line: 10,
        category: 'bug',
        severity: 'high',
        content: 'End line before start line',
      };
      expect(validateReviewFinding(findingBadLines).valid).toBe(false);

      const findingBadSev: any = {
        path: 'src/auth.ts',
        start_line: 1,
        end_line: 5,
        category: 'bug',
        severity: 'extreme-blocker',
        content: 'Invalid severity name',
      };
      expect(validateReviewFinding(findingBadSev).valid).toBe(false);
    });
  });

  describe('Finding Summarization & Verdicts', () => {
    test('emits APPROVE when no critical or high issues exist and all files reviewed', () => {
      const findings: ReviewFinding[] = [
        {
          path: 'src/util.ts',
          start_line: 10,
          end_line: 12,
          category: 'style',
          severity: 'low',
          content: 'Consider renaming variable for clarity',
        },
      ];

      const summary = summarizeReviewFindings(findings, 5, 5);
      expect(summary.verdict).toBe('APPROVE');
      expect(summary.coverage_rate).toBe(100);
      expect(summary.critical_count).toBe(0);
      expect(summary.high_count).toBe(0);
    });

    test('emits CHANGES_REQUIRED when critical or high issues exist', () => {
      const findings: ReviewFinding[] = [
        {
          path: 'src/auth.ts',
          start_line: 45,
          end_line: 50,
          category: 'security',
          severity: 'critical',
          content: 'SQL injection vulnerability',
        },
      ];

      const summary = summarizeReviewFindings(findings, 3, 3);
      expect(summary.verdict).toBe('CHANGES_REQUIRED');
      expect(summary.critical_count).toBe(1);
    });

    test('emits INCOMPLETE when files were skipped', () => {
      const summary = summarizeReviewFindings([], 5, 3);
      expect(summary.verdict).toBe('INCOMPLETE');
      expect(summary.skipped_files).toBe(2);
      expect(summary.coverage_rate).toBe(60);
    });
  });
});
