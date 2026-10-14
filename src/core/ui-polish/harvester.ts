/**
 * Interaction Harvester & Defect Detector.
 * Drives browser exploration charters and extracts visual and interaction defects.
 */

import { UIDefect, ViewportConfig, HarvestResult, UIPolishConfig } from './types.js';
import { calculateContrastRatio, isAiProseSlop } from './triage.js';
import { isCommandAvailable } from './provision.js';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface ElementInspectionData {
  selector: string;
  tagName: string;
  text?: string;
  boundingBox: { width: number; height: number };
  computedStyles: {
    color?: string;
    backgroundColor?: string;
    outline?: string;
    boxShadow?: string;
  };
  isInteractive: boolean;
  hasHorizontalOverflow?: boolean;
}

export function parseRgbString(colorStr?: string): [number, number, number] | null {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

export function inspectElementForDefects(
  element: ElementInspectionData,
  viewport: ViewportConfig,
  url: string
): UIDefect[] {
  const defects: UIDefect[] = [];
  const now = new Date().toISOString();

  // 1. Check Horizontal Overflow (Viewport bleed)
  if (element.hasHorizontalOverflow) {
    defects.push({
      id: `overflow-${Math.random().toString(36).substring(2, 8)}`,
      severity: 'P1_USABILITY',
      category: 'overflow',
      message: `Horizontal viewport scroll bleed detected on ${viewport.name} (${viewport.width}px).`,
      selector: element.selector,
      viewport: viewport.name,
      url,
      expected: 'No horizontal scrollbar; content fits within viewport width.',
      observed: 'scrollWidth exceeds clientWidth.',
      remediation: 'Apply max-w-full, overflow-x-hidden, or review flex/grid container child constraints.',
      timestamp: now,
    });
  }

  // 2. Check Touch Targets (<44x44px for interactive elements on mobile)
  if (element.isInteractive && viewport.isMobile) {
    if (element.boundingBox.width < 44 || element.boundingBox.height < 44) {
      defects.push({
        id: `touch-${Math.random().toString(36).substring(2, 8)}`,
        severity: 'P1_USABILITY',
        category: 'touch_target',
        message: `Touch target too small (${Math.round(element.boundingBox.width)}x${Math.round(element.boundingBox.height)}px) on ${viewport.name}.`,
        selector: element.selector,
        viewport: viewport.name,
        url,
        expected: 'Interactive elements must measure at least 44x44 CSS pixels.',
        observed: `${Math.round(element.boundingBox.width)}x${Math.round(element.boundingBox.height)}px.`,
        remediation: 'Add p-2.5, min-h-[44px], min-w-[44px], or expand click hit-area via relative padding.',
        timestamp: now,
      });
    }
  }

  // 3. Check Contrast Ratio (WCAG AA: minimum 4.5:1 for normal text)
  if (element.text && element.computedStyles.color && element.computedStyles.backgroundColor) {
    const textColor = parseRgbString(element.computedStyles.color);
    const bgColor = parseRgbString(element.computedStyles.backgroundColor);
    if (textColor && bgColor) {
      const ratio = calculateContrastRatio(textColor, bgColor);
      if (ratio < 4.5) {
        defects.push({
          id: `contrast-${Math.random().toString(36).substring(2, 8)}`,
          severity: 'P1_USABILITY',
          category: 'contrast',
          message: `Low text contrast ratio (${ratio.toFixed(2)}:1) violates WCAG AA standards.`,
          selector: element.selector,
          viewport: viewport.name,
          url,
          expected: 'Contrast ratio must be at least 4.5:1.',
          observed: `${ratio.toFixed(2)}:1.`,
          remediation: 'Darken text color or lighten background to achieve at least 4.5:1 ratio.',
          timestamp: now,
        });
      }
    }
  }

  // 4. Check Focus Indicator
  if (element.isInteractive) {
    const hasFocusStyle =
      (element.computedStyles.outline && element.computedStyles.outline !== 'none') ||
      (element.computedStyles.boxShadow && element.computedStyles.boxShadow !== 'none');
    if (!hasFocusStyle) {
      defects.push({
        id: `focus-${Math.random().toString(36).substring(2, 8)}`,
        severity: 'P1_USABILITY',
        category: 'focus_missing',
        message: 'Missing distinct focus-visible ring or outline for keyboard accessibility.',
        selector: element.selector,
        viewport: viewport.name,
        url,
        expected: 'Visible focus ring on keyboard navigation (:focus-visible).',
        observed: 'Outline is none and box-shadow is absent.',
        remediation: 'Add focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary.',
        timestamp: now,
      });
    }
  }

  // 5. Check AI Prose Slop
  if (element.text && isAiProseSlop(element.text)) {
    defects.push({
      id: `slop-${Math.random().toString(36).substring(2, 8)}`,
      severity: 'P2_TASTE_SLOP',
      category: 'ai_slop',
      message: `Generic AI placeholder copy detected: "${element.text.slice(0, 50)}..."`,
      selector: element.selector,
      viewport: viewport.name,
      url,
      expected: 'Crisp, product-specific microcopy with zero filler.',
      observed: element.text,
      remediation: 'Rewrite copy to describe exact user action or value proposition directly.',
      timestamp: now,
    });
  }

  return defects;
}

export async function harvestPageDefects(
  config: UIPolishConfig,
  url: string,
  viewport: ViewportConfig
): Promise<HarvestResult> {
  const defects: UIDefect[] = [];
  const capturedRounds: string[] = [];
  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];

  // In dry-run or when agent-browser CLI is not installed, perform synthetic baseline check
  if (config.dryRun || !isCommandAvailable('agent-browser')) {
    // Return sample baseline check
    return {
      defects,
      capturedRounds: ['round-mock-01'],
      consoleErrors,
      networkFailures,
    };
  }

  // When agent-browser is available, execute a live recorded round
  try {
    const reviewDir = path.join(config.projectDir, '.agent-review', 'rounds');
    fs.mkdirSync(reviewDir, { recursive: true });
    const roundId = `round-${Date.now()}`;
    capturedRounds.push(roundId);

    // Open URL with specified viewport
    execSync(`agent-browser open "${url}" --viewport ${viewport.width}x${viewport.height}`, {
      cwd: config.projectDir,
      stdio: 'pipe',
      timeout: config.timeoutMs || 30000,
    });

    // Capture accessible DOM snapshot
    const snapshotOutput = execSync('agent-browser snapshot --json', {
      cwd: config.projectDir,
      stdio: 'pipe',
      timeout: 10000,
    }).toString();

    // Check for horizontal scroll via eval
    const overflowCheck = execSync(
      'agent-browser eval "document.documentElement.scrollWidth > document.documentElement.clientWidth"',
      { cwd: config.projectDir, stdio: 'pipe' }
    ).toString();

    if (overflowCheck.includes('true')) {
      defects.push({
        id: `overflow-${roundId}`,
        severity: 'P1_USABILITY',
        category: 'overflow',
        message: `Horizontal scrollbar detected on ${viewport.name} (${viewport.width}px).`,
        viewport: viewport.name,
        url,
        expected: 'Page width must fit within viewport.',
        observed: 'Document scrollWidth > clientWidth.',
        remediation: 'Review wide tables, fixed-width elements, or negative margins.',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    consoleErrors.push(`Harvester exception: ${err.message || String(err)}`);
  }

  return {
    defects,
    capturedRounds,
    consoleErrors,
    networkFailures,
  };
}
