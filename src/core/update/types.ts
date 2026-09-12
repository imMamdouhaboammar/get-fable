export type UpdateChannel = 'stable';

export interface ReleaseMetadata {
  version: string;
  channel: UpdateChannel;
  source: 'npm';
  checkedAt: string;
  publishedAt?: string;
  releaseUrl?: string;
  notesUrl?: string;
  integrity?: string;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (
  input: string,
  init?: {
    signal?: AbortSignal;
    redirect?: RequestRedirect;
    headers?: Record<string, string>;
  }
) => Promise<FetchResponseLike>;

export type InstallationMethod =
  | 'bun-global'
  | 'npm-global'
  | 'homebrew'
  | 'git-checkout'
  | 'unknown';

export interface InstallationInfo {
  method: InstallationMethod;
  executablePath: string;
  repoRoot?: string;
  packageRoot?: string;
  evidence: string[];
}

export interface InstallationDetectionContext {
  executablePath: string;
  repoRoot: string;
  bunGlobalDir?: string;
  npmGlobalDir?: string;
  homebrewPrefix?: string;
  fileExists: (path: string) => boolean;
}

export interface UpdatePlan {
  currentVersion: string;
  targetVersion: string;
  installation: InstallationInfo;
  strategy: InstallationMethod | 'notify-only';
  executable?: string;
  argv?: string[];
  requiresConfirmation: boolean;
  reason: string;
}

export interface UpdatePlanInput {
  currentVersion: string;
  targetVersion: string;
  installation: InstallationInfo;
  targetKind: 'latest-stable' | 'explicit-version';
}

export interface ProcessResult {
  status: number;
  stdout: string;
  stderr: string;
}

export type ProcessRunner = (
  executable: string,
  argv: string[],
  options?: { cwd?: string }
) => ProcessResult;

export interface UpdateReceipt {
  success: boolean;
  strategy: UpdatePlan['strategy'];
  targetVersion: string;
  verifiedVersion?: string;
  message: string;
}
