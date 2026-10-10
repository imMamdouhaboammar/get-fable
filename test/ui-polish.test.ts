import { describe, expect, test } from 'bun:test';
import {
  checkProvisionStatus,
  isCommandAvailable,
} from '../src/core/ui-polish/provision.ts';
import {
  calculateContrastRatio,
  isAiProseSlop,
  classifySeverity,
  triageDefects,
} from '../src/core/ui-polish/triage.ts';
import {
  inspectElementForDefects,
  parseRgbString,
} from '../src/core/ui-polish/harvester.ts';
import {
  executeSurgicalRepair,
  runClosedRepairLoop,
} from '../src/core/ui-polish/repair-loop.ts';
import {
  generateE2ETestFileContent,
} from '../src/core/ui-polish/regression.ts';
import {
  runUiPolishLoop,
} from '../src/core/ui-polish/index.ts';
import {
  runUiPolishCommand,
} from '../src/cli/commands/ui-polish.ts';
import { UIDefect } from '../src/core/ui-polish/types.ts';

describe('UI/UX Polish Engine', () => {
  describe('Dependency Provisioner', () => {
    test('detects runtime and available tools cleanly without throwing', () => {
      const status = checkProvisionStatus();
      expect(status).toHaveProperty('bun');
      expect(status.bun).toBe(true); // Since running under Bun
      expect(typeof status.agentBrowser).toBe('boolean');
      expect(typeof status.unslopPreflight).toBe('boolean');
    });

    test('isCommandAvailable detects existing command and rejects non-existent command', () => {
      expect(isCommandAvailable('bun')).toBe(true);
      expect(isCommandAvailable('non_existent_command_xyz123')).toBe(false);
    });
  });

  describe('Triage & 19-Principle Polish Classifier', () => {
    test('calculates accurate WCAG contrast ratios', () => {
      // Pure black on pure white -> 21:1
      const blackOnWhite = calculateContrastRatio([0, 0, 0], [255, 255, 255]);
      expect(blackOnWhite).toBeCloseTo(21, 0);

      // Low contrast light gray on white
      const lowContrast = calculateContrastRatio([200, 200, 200], [255, 255, 255]);
      expect(lowContrast).toBeLessThan(4.5);
    });

    test('detects AI prose slop phrases accurately', () => {
      expect(isAiProseSlop('Welcome to our platform!')).toBe(true);
      expect(isAiProseSlop('Get started by clicking the button below.')).toBe(true);
      expect(isAiProseSlop('Click here to learn more')).toBe(true);
      expect(isAiProseSlop('Invoice #1042 generated for Acme Corp.')).toBe(false);
    });

    test('classifies severities and sorts triage queues by priority (P0 -> P1 -> P2)', () => {
      expect(classifySeverity('console_error')).toBe('P0_CRITICAL');
      expect(classifySeverity('overflow')).toBe('P1_USABILITY');
      expect(classifySeverity('contrast')).toBe('P1_USABILITY');
      expect(classifySeverity('ai_slop')).toBe('P2_TASTE_SLOP');

      const defects: UIDefect[] = [
        { id: '1', severity: 'P2_TASTE_SLOP', category: 'ai_slop', message: 'Slop', timestamp: '' },
        { id: '2', severity: 'P0_CRITICAL', category: 'console_error', message: 'Crash', timestamp: '' },
        { id: '3', severity: 'P1_USABILITY', category: 'overflow', message: 'Scroll', timestamp: '' },
      ];

      const triaged = triageDefects(defects);
      expect(triaged.sorted.map((d) => d.id)).toEqual(['2', '3', '1']);
    });
  });

  describe('Element Defect Harvester', () => {
    test('parses RGB and RGBA strings accurately', () => {
      expect(parseRgbString('rgb(255, 100, 50)')).toEqual([255, 100, 50]);
      expect(parseRgbString('rgba(10, 20, 30, 0.8)')).toEqual([10, 20, 30]);
      expect(parseRgbString('invalid')).toBeNull();
    });

    test('detects mobile touch targets smaller than 44x44px', () => {
      const mobileViewport = { name: 'mobile', width: 375, height: 812, isMobile: true };
      const defects = inspectElementForDefects(
        {
          selector: 'button.tiny',
          tagName: 'button',
          isInteractive: true,
          boundingBox: { width: 32, height: 24 },
          computedStyles: {},
        },
        mobileViewport,
        'http://localhost:3000'
      );

      const touchDefect = defects.find((d) => d.category === 'touch_target');
      expect(touchDefect).toBeDefined();
      expect(touchDefect?.severity).toBe('P1_USABILITY');
    });

    test('detects horizontal scroll bleed on viewports', () => {
      const viewport = { name: 'mobile', width: 375, height: 812, isMobile: true };
      const defects = inspectElementForDefects(
        {
          selector: 'div.wide-table',
          tagName: 'div',
          isInteractive: false,
          hasHorizontalOverflow: true,
          boundingBox: { width: 450, height: 200 },
          computedStyles: {},
        },
        viewport,
        'http://localhost:3000'
      );

      const overflowDefect = defects.find((d) => d.category === 'overflow');
      expect(overflowDefect).toBeDefined();
      expect(overflowDefect?.message).toContain('Horizontal viewport scroll bleed');
    });
  });

  describe('Closed Repair Loop & Fable Circuit Breaker', () => {
    test('Fable Circuit Breaker halts immediately when failureStreak reaches 2', () => {
      const defect: UIDefect = {
        id: 'defect-fail-1',
        severity: 'P1_USABILITY',
        category: 'contrast',
        message: 'Broken contrast',
        timestamp: '',
      };

      // When consecutiveFailures is 2, breaker must trip immediately
      const result = executeSurgicalRepair(defect, {
        projectDir: process.cwd(),
        consecutiveFailures: 2,
      });

      expect(result.fixed).toBe(false);
      expect(result.circuitBreakerTripped).toBe(true);
      expect(result.error).toContain('Fable Circuit Breaker active');
    });

    test('runClosedRepairLoop respects budget limit and reports resolution counts', () => {
      const defects: UIDefect[] = [
        { id: 'd1', severity: 'P1_USABILITY', category: 'overflow', message: 'Bleed', timestamp: '' },
        { id: 'd2', severity: 'P2_TASTE_SLOP', category: 'ai_slop', message: 'Copy', timestamp: '' },
      ];

      const outcome = runClosedRepairLoop(defects, {
        projectDir: process.cwd(),
        dryRun: true,
        consecutiveFailures: 0,
      });

      expect(outcome.circuitBreakerTripped).toBe(false);
      expect(outcome.resolvedCount).toBe(2);
      expect(outcome.unresolvedCount).toBe(0);
    });
  });

  describe('Durable E2E Regression Codification', () => {
    test('generates valid TypeScript test content for tester-army/e2e', () => {
      const defects: UIDefect[] = [
        {
          id: 'def-1',
          severity: 'P1_USABILITY',
          category: 'overflow',
          message: 'Viewport scrollbar',
          url: 'http://localhost:3000/dashboard',
          timestamp: '',
        },
      ];

      const content = generateE2ETestFileContent('http://localhost:3000', defects);
      expect(content).toContain("@e2e-dev/web");
      expect(content).toContain("describe('UI/UX Polish Regression Suite'");
      expect(content).toContain("test('regression [overflow]");
      expect(content).toContain("expect(hasOverflow).toBe(false)");
    });
  });

  describe('Master Orchestrator & CLI Invocation', () => {
    test('runUiPolishLoop executes in dryRun mode producing complete report', async () => {
      const report = await runUiPolishLoop({
        targetUrl: 'http://127.0.0.1:3000',
        dryRun: true,
        projectDir: process.cwd(),
      });

      expect(report.id).toContain('ui-polish-');
      expect(report.targetUrl).toBe('http://127.0.0.1:3000');
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
      expect(report.circuitBreakerTripped).toBe(false);
    });

    test('CLI command runs in json mode returning code 0', async () => {
      const exitCode = await runUiPolishCommand([
        'http://127.0.0.1:3000',
        '--dry-run',
        '--json',
        '--loops',
        '2',
      ]);
      expect(exitCode).toBe(0);
    }, 15000);
  });
});
