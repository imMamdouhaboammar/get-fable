/**
 * Autonomous UI/UX Polish & E2E Testing Engine Types
 * Follows OmniSkill Universal Contract and Fable Lifecycle standards.
 */

export type UIDefectSeverity = 'P0_CRITICAL' | 'P1_USABILITY' | 'P2_TASTE_SLOP';

export type UIDefectCategory =
  | 'clipping'
  | 'overflow'
  | 'contrast'
  | 'touch_target'
  | 'focus_missing'
  | 'console_error'
  | 'network_failure'
  | 'ai_slop'
  | 'state_missing';

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
}

export const CANONICAL_VIEWPORTS: ViewportConfig[] = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'tablet', width: 768, height: 1024, isMobile: true },
  { name: 'mobile', width: 375, height: 812, isMobile: true },
];

export interface UIDefect {
  id: string;
  severity: UIDefectSeverity;
  category: UIDefectCategory;
  message: string;
  selector?: string;
  viewport?: string;
  url?: string;
  expected?: string;
  observed?: string;
  remediation?: string;
  timestamp: string;
}

export interface UIPolishConfig {
  targetUrl: string;
  viewports: ViewportConfig[];
  maxLoops: number;
  headed: boolean;
  autoInstall: boolean;
  dryRun: boolean;
  timeoutMs: number;
  projectDir: string;
  generateE2E: boolean;
}

export interface PreflightResult {
  ok: boolean;
  hasProductMd: boolean;
  hasDesignMd: boolean;
  issues: string[];
  reportPath?: string;
}

export interface HarvestResult {
  defects: UIDefect[];
  capturedRounds: string[];
  consoleErrors: string[];
  networkFailures: string[];
}

export interface RepairResult {
  defectId: string;
  fixed: boolean;
  streak: number;
  circuitBreakerTripped: boolean;
  patchSummary?: string;
  error?: string;
}

export interface UIPolishReport {
  id: string;
  targetUrl: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  inventoriedRoutes: string[];
  totalDefects: number;
  resolvedDefects: number;
  remainingDefects: number;
  circuitBreakerTripped: boolean;
  defects: UIDefect[];
  evidenceStamp?: {
    kind: string;
    source: string;
    detail: string;
    generation: number;
  };
}
