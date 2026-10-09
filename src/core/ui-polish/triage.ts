/**
 * Defect Triage & 19-Principle Polish Classifier.
 * Categorizes visual, interactive, and prose defects according to impeccable & anti-ui-slop standards.
 */

import { UIDefect, UIDefectSeverity, UIDefectCategory } from './types.js';

export const AI_SLOP_PROSE_PATTERNS: RegExp[] = [
  /welcome to (our|the) (platform|application|website|dashboard)/i,
  /get started by (clicking|navigating|doing)/i,
  /click here to (learn more|continue|proceed)/i,
  /in today'?s fast-paced world/i,
  /seamlessly (integrate|manage|experience)/i,
  /empower(ing)? your (team|workflow|productivity)/i,
];

export function isAiProseSlop(text: string): boolean {
  return AI_SLOP_PROSE_PATTERNS.some((pattern) => pattern.test(text));
}

export function calculateRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = calculateRelativeLuminance(...rgb1);
  const l2 = calculateRelativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function classifySeverity(category: UIDefectCategory): UIDefectSeverity {
  switch (category) {
    case 'console_error':
    case 'network_failure':
      return 'P0_CRITICAL';
    case 'overflow':
    case 'clipping':
    case 'contrast':
    case 'touch_target':
    case 'focus_missing':
      return 'P1_USABILITY';
    case 'ai_slop':
    case 'state_missing':
    default:
      return 'P2_TASTE_SLOP';
  }
}

export function triageDefects(defects: UIDefect[]): {
  p0: UIDefect[];
  p1: UIDefect[];
  p2: UIDefect[];
  sorted: UIDefect[];
} {
  const p0: UIDefect[] = [];
  const p1: UIDefect[] = [];
  const p2: UIDefect[] = [];

  for (const defect of defects) {
    if (defect.severity === 'P0_CRITICAL') {
      p0.push(defect);
    } else if (defect.severity === 'P1_USABILITY') {
      p1.push(defect);
    } else {
      p2.push(defect);
    }
  }

  // Priority order: P0 first (fatal bugs), then P1 (usability/A11y), then P2 (taste/polish)
  const sorted = [...p0, ...p1, ...p2];

  return { p0, p1, p2, sorted };
}
