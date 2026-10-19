export type TriageCategory =
  | 'failing-ci'
  | 'pending-pr'
  | 'open-issue'
  | 'slop-vulnerability'
  | 'feature-innovation';

export interface GitHubRunSnapshot {
  databaseId: number;
  name: string;
  workflowName: string;
  conclusion: string;
  headBranch: string;
  url?: string;
}

export interface GitHubPrSnapshot {
  number: number;
  title: string;
  headRefName: string;
  baseRefName: string;
  isDraft: boolean;
  mergeable?: string;
  author?: { login: string };
  url?: string;
}

export interface GitHubIssueSnapshot {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  body?: string;
  url?: string;
}

export interface LocalAuditFinding {
  kind: 'anti-slop' | 'security' | 'untracked-feature' | 'broken-test';
  severity: 'blocker' | 'review' | 'warning' | 'info';
  target: string;
  issue: string;
  action: string;
}

export interface LocalAuditSnapshot {
  findings: LocalAuditFinding[];
  hasFailingLocalTests: boolean;
  untrackedFilesCount: number;
  modifiedFilesCount: number;
}

export interface TriageDecision {
  tier: 1 | 2 | 3 | 4 | 5;
  category: TriageCategory;
  title: string;
  description: string;
  targetReference?: string;
  recommendedSkill: string;
  suggestedTask: string;
  reasons: string[];
  confidence: number;
}

export interface StewardOptions {
  loop?: boolean;
  intervalSeconds?: number;
  maxCycles?: number;
  dryRun?: boolean;
  allowSelfMerge?: boolean;
  ignoredTargets?: string[];
  watchdog?: boolean;
  watchdogTimeoutMs?: number;
  cwd?: string;
  json?: boolean;
  jsonV1?: boolean;
}

export interface StewardCycleResult {
  cycleIndex: number;
  timestamp: string;
  decision: TriageDecision;
  delegationPlan?: any;
  executed: boolean;
  actionOutput?: string;
  artifactsCreated?: string[];
  workSummary?: string;
  status: 'success' | 'skipped' | 'failed' | 'circuit-breaker';
  message: string;
}
